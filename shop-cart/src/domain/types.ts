export type ProductId = string;
export type WarehouseId = string;
export type OrderId = string;

export interface Product {
  id: ProductId;
  name: string;
  priceCents: number;
}

export interface OrderItemInput {
  productId: ProductId;
  quantity: number;
}

export interface AllocationChunk {
  warehouseId: WarehouseId;
  productId: ProductId;
  quantity: number;
}

export interface OrderAllocationPlan {
  orderId: OrderId;
  chunks: AllocationChunk[];
}

export interface Order {
  id: OrderId;
  items: OrderItemInput[];
  totalCents: number;
  allocation: OrderAllocationPlan;
  status: 'CREATED' | 'FAILED';
}
