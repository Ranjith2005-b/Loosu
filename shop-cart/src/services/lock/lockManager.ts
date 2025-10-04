import { DeadlockError, TimeoutError } from '../../utils/errors';

interface LockWaiter {
  ownerId: string;
  resolve: () => void;
  reject: (err: Error) => void;
  timeout?: NodeJS.Timeout;
}

interface LockState {
  resourceKey: string;
  holder?: string;
  holdCount: number;
  queue: LockWaiter[];
}

export class LockManager {
  private resourceToLock: Map<string, LockState> = new Map();
  private waitForGraph: Map<string, Set<string>> = new Map(); // waiter -> set of holders it waits on
  private ownerToResources: Map<string, Set<string>> = new Map();

  private getOrCreateLock(resourceKey: string): LockState {
    const existing = this.resourceToLock.get(resourceKey);
    if (existing) return existing;
    const created: LockState = { resourceKey, holder: undefined, holdCount: 0, queue: [] };
    this.resourceToLock.set(resourceKey, created);
    return created;
  }

  private addWaitEdge(waiter: string, holder: string) {
    if (!this.waitForGraph.has(waiter)) this.waitForGraph.set(waiter, new Set());
    this.waitForGraph.get(waiter)!.add(holder);
  }

  private removeAllEdgesFrom(owner: string) {
    this.waitForGraph.delete(owner);
  }

  private removeEdgesPointingTo(owner: string) {
    for (const [, holders] of this.waitForGraph) {
      holders.delete(owner);
    }
  }

  private detectCycle(start: string): boolean {
    const visited: Set<string> = new Set();
    const stack: Set<string> = new Set();

    const dfs = (node: string): boolean => {
      if (!this.waitForGraph.has(node)) return false;
      visited.add(node);
      stack.add(node);
      for (const next of this.waitForGraph.get(node)!) {
        if (!visited.has(next) && dfs(next)) return true;
        if (stack.has(next)) return true;
      }
      stack.delete(node);
      return false;
    };

    return dfs(start);
  }

  async acquire(resourceKey: string, ownerId: string, timeoutMs = 2000): Promise<() => void> {
    const lock = this.getOrCreateLock(resourceKey);

    // Re-entrant acquire
    if (lock.holder === ownerId) {
      lock.holdCount += 1;
      return () => this.release(resourceKey, ownerId);
    }

    // Fast path
    if (!lock.holder) {
      lock.holder = ownerId;
      lock.holdCount = 1;
      if (!this.ownerToResources.has(ownerId)) this.ownerToResources.set(ownerId, new Set());
      this.ownerToResources.get(ownerId)!.add(resourceKey);
      return () => this.release(resourceKey, ownerId);
    }

    // Slow path: must wait
    const holder = lock.holder;
    const waiter: Partial<LockWaiter> = { ownerId };

    const promise = new Promise<void>((resolve, reject) => {
      waiter.resolve = resolve;
      waiter.reject = reject;
    });

    // Add wait edge and check for deadlock
    if (holder) this.addWaitEdge(ownerId, holder);
    if (this.detectCycle(ownerId)) {
      // Cleanup the edge
      this.removeAllEdgesFrom(ownerId);
      throw new DeadlockError();
    }

    // Queue up and set timeout
    const typedWaiter = waiter as LockWaiter;
    if (timeoutMs > 0) {
      typedWaiter.timeout = setTimeout(() => {
        // Remove waiter from queue if still present
        const index = lock.queue.findIndex(w => w === typedWaiter);
        if (index >= 0) lock.queue.splice(index, 1);
        this.removeAllEdgesFrom(ownerId);
        typedWaiter.reject(new TimeoutError());
      }, timeoutMs);
    }

    lock.queue.push(typedWaiter);

    await promise;

    if (typedWaiter.timeout) clearTimeout(typedWaiter.timeout);

    // Became holder
    this.removeAllEdgesFrom(ownerId);
    lock.holder = ownerId;
    lock.holdCount = 1;
    if (!this.ownerToResources.has(ownerId)) this.ownerToResources.set(ownerId, new Set());
    this.ownerToResources.get(ownerId)!.add(resourceKey);

    return () => this.release(resourceKey, ownerId);
  }

  private release(resourceKey: string, ownerId: string) {
    const lock = this.getOrCreateLock(resourceKey);
    if (lock.holder !== ownerId) {
      return; // ignore invalid release
    }

    lock.holdCount -= 1;
    if (lock.holdCount > 0) return;

    // Fully release
    lock.holder = undefined;
    this.ownerToResources.get(ownerId)?.delete(resourceKey);

    // Grant next waiter if any
    const next = lock.queue.shift();
    if (next) {
      // The next waiter will become the holder; it should not wait on previous holder anymore
      this.removeEdgesPointingTo(ownerId);
      next.resolve();
    }
  }

  async withLocks<T>(resourceKeys: string[], ownerId: string, fn: () => Promise<T>, timeoutMs = 3000): Promise<T> {
    // De-duplicate resources while preserving order
    const seen = new Set<string>();
    const orderedUnique = resourceKeys.filter(k => (seen.has(k) ? false : (seen.add(k), true)));

    const releases: Array<() => void> = [];
    try {
      for (const key of orderedUnique) {
        const release = await this.acquire(key, ownerId, timeoutMs);
        releases.push(release);
      }
      return await fn();
    } catch (err) {
      throw err;
    } finally {
      // Release in reverse order
      for (let i = releases.length - 1; i >= 0; i -= 1) {
        try { releases[i](); } catch { /* ignore */ }
      }
    }
  }
}
