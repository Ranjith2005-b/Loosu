export class DeadlockError extends Error {
  public readonly code = "DEADLOCK";
  constructor(message = "Deadlock detected; transaction aborted") {
    super(message);
    this.name = "DeadlockError";
  }
}

export class TimeoutError extends Error {
  public readonly code = "TIMEOUT";
  constructor(message = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

export class NotEnoughStockError extends Error {
  public readonly code = "INSUFFICIENT_STOCK";
  constructor(message = "Insufficient stock to fulfill request") {
    super(message);
    this.name = "NotEnoughStockError";
  }
}

export class ValidationError extends Error {
  public readonly code = "VALIDATION";
  constructor(message = "Invalid request") {
    super(message);
    this.name = "ValidationError";
  }
}
