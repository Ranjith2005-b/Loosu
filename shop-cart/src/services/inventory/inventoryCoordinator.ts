import { v4 as uuidv4 } from 'uuid';
import { LockManager } from '../lock/lockManager';
import { InventoryStore } from './inventoryStores';
import { AllocationChunk, OrderAllocationPlan, OrderId, OrderItemInput, ProductId, WarehouseId } from '../../domain/types';
import { NotEnoughStockError } from '../../utils/errors';

/**
 * Coordinates allocation across warehouses using a simple 2PC-like protocol:
 * 1) Prepare: compute allocation plan; acquire locks on involved (warehouse,product)
 * 2) Reserve: deduct from available, add to reserved
 * 3) Commit: finalize reservation (kept in reserved for demonstration)
 * Rollback on failure.
 */
export class InventoryCoordinator {
  private readonly store: InventoryStore = new InventoryStore();
  private readonly lockManager: LockManager;
  private readonly warehouseIds: WarehouseId[] = ['W1', 'W2', 'W3'];

  constructor(lockManager: LockManager) {
    this.lockManager = lockManager;
  }

  listWarehouses(): WarehouseId[] {
    return [...this.warehouseIds];
  }

  seedStock(productId: ProductId, byWarehouse: Record<WarehouseId, number>) {
    for (const [wid, qty] of Object.entries(byWarehouse)) {
      this.store.setAvailable({ warehouseId: wid as WarehouseId, productId }, qty);
    }
  }

  getAvailableByWarehouse(productId: ProductId): Record<WarehouseId, number> {
    const result: Record<string, number> = {};
    for (const wid of this.warehouseIds) {
      result[wid] = this.store.getAvailable({ warehouseId: wid, productId });
    }
    return result as Record<WarehouseId, number>;
  }

  async allocateOrder(orderId: OrderId, items: OrderItemInput[]): Promise<OrderAllocationPlan> {
    // compute allocation plan greedily: fill from warehouses in order W1->W2->W3
    const chunks: AllocationChunk[] = [];
    const resourcesToLock: string[] = [];

    for (const item of items) {
      let remaining = item.quantity;
      for (const wid of this.warehouseIds) {
        if (remaining <= 0) break;
        const avail = this.store.getAvailable({ warehouseId: wid, productId: item.productId });
        const take = Math.min(avail, remaining);
        if (take > 0) {
          chunks.push({ warehouseId: wid, productId: item.productId, quantity: take });
          remaining -= take;
          resourcesToLock.push(this.resourceKey(wid, item.productId));
        }
      }
      if (remaining > 0) {
        throw new NotEnoughStockError(`Not enough stock for product ${item.productId}`);
      }
    }

    const txId = `alloc:${orderId}:${uuidv4()}`;

    // Prepare + Reserve with locks
    await this.lockManager.withLocks(resourcesToLock, txId, async () => {
      // Validate again under locks
      const availableCheck: Array<{ wid: WarehouseId; pid: ProductId; needed: number; avail: number }> = [];
      for (const chunk of chunks) {
        const avail = this.store.getAvailable({ warehouseId: chunk.warehouseId, productId: chunk.productId });
        availableCheck.push({ wid: chunk.warehouseId, pid: chunk.productId, needed: chunk.quantity, avail });
        if (avail < chunk.quantity) throw new NotEnoughStockError(`Concurrent change reduced stock for product ${chunk.productId}`);
      }

      // Reserve: move from available to reserved
      for (const chk of availableCheck) {
        this.store.addAvailable({ warehouseId: chk.wid, productId: chk.pid }, -chk.needed);
        this.store.addReserved({ warehouseId: chk.wid, productId: chk.pid }, chk.needed);
      }
    });

    // Commit phase is trivial in-memory. In a real DB, we would mark rows.
    const plan: OrderAllocationPlan = { orderId, chunks };
    return plan;
  }

  private resourceKey(warehouseId: WarehouseId, productId: ProductId): string {
    return `stock:${warehouseId}:${productId}`;
  }
}
