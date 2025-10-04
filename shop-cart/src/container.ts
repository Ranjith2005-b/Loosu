import { CatalogService } from './services/catalog/catalogService';
import { InventoryCoordinator } from './services/inventory/inventoryCoordinator';
import { OrdersService } from './services/orders/ordersService';
import { LockManager } from './services/lock/lockManager';
import { SeedData } from './data/seed';

export function buildContainer() {
  const lockManager = new LockManager();
  const catalogService = new CatalogService();
  const inventoryCoordinator = new InventoryCoordinator(lockManager);
  const ordersService = new OrdersService(lockManager, catalogService, inventoryCoordinator);

  // Seed demo data
  const seed = new SeedData(catalogService, inventoryCoordinator);
  seed.seed();

  return {
    lockManager,
    catalogService,
    inventoryCoordinator,
    ordersService,
  };
}
