import { ProductId, WarehouseId } from '../../domain/types';

export interface WarehouseStockKey {
  warehouseId: WarehouseId;
  productId: ProductId;
}

export class InventoryStore {
  // represents available stock per (warehouse, product)
  private available: Map<string, number> = new Map();
  // reserved but not yet committed
  private reserved: Map<string, number> = new Map();

  private keyOf(k: WarehouseStockKey): string {
    return `${k.warehouseId}::${k.productId}`;
  }

  setAvailable(k: WarehouseStockKey, qty: number) {
    this.available.set(this.keyOf(k), Math.max(0, Math.floor(qty)));
  }

  getAvailable(k: WarehouseStockKey): number {
    return this.available.get(this.keyOf(k)) ?? 0;
  }

  addAvailable(k: WarehouseStockKey, delta: number) {
    const key = this.keyOf(k);
    this.available.set(key, (this.available.get(key) ?? 0) + Math.floor(delta));
  }

  getReserved(k: WarehouseStockKey): number {
    return this.reserved.get(this.keyOf(k)) ?? 0;
  }

  addReserved(k: WarehouseStockKey, delta: number) {
    const key = this.keyOf(k);
    this.reserved.set(key, (this.reserved.get(key) ?? 0) + Math.floor(delta));
  }
}
