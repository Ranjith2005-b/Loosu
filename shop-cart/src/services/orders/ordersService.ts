import { v4 as uuidv4 } from 'uuid';
import { CatalogService } from '../catalog/catalogService';
import { InventoryCoordinator } from '../inventory/inventoryCoordinator';
import { LockManager } from '../lock/lockManager';
import { Order, OrderAllocationPlan, OrderId, OrderItemInput } from '../../domain/types';

export class OrdersService {
  constructor(
    private readonly lockManager: LockManager,
    private readonly catalog: CatalogService,
    private readonly inventory: InventoryCoordinator
  ) {}

  createOrder = async (items: OrderItemInput[]): Promise<Order> => {
    const orderId: OrderId = uuidv4();

    // Compute total using catalog
    let totalCents = 0;
    for (const item of items) {
      const p = this.catalog.get(item.productId);
      if (!p) throw new Error(`Product not found: ${item.productId}`);
      totalCents += p.priceCents * item.quantity;
    }

    let allocation: OrderAllocationPlan;
    try {
      allocation = await this.inventory.allocateOrder(orderId, items);
    } catch (err) {
      return { id: orderId, items, totalCents, allocation: { orderId, chunks: [] }, status: 'FAILED' };
    }

    return { id: orderId, items, totalCents, allocation, status: 'CREATED' };
  };
}
