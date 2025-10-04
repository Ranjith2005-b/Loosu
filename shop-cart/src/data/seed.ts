import { CatalogService } from '../services/catalog/catalogService';
import { InventoryCoordinator } from '../services/inventory/inventoryCoordinator';

export class SeedData {
  constructor(
    private readonly catalog: CatalogService,
    private readonly inventory: InventoryCoordinator
  ) {}

  seed() {
    this.catalog.create({ id: 'p1', name: 'Wireless Mouse', priceCents: 2999 });
    this.catalog.create({ id: 'p2', name: 'Mechanical Keyboard', priceCents: 8999 });
    this.catalog.create({ id: 'p3', name: 'USB-C Cable', priceCents: 999 });

    this.inventory.seedStock('p1', { W1: 3, W2: 2, W3: 0 });
    this.inventory.seedStock('p2', { W1: 1, W2: 1, W3: 1 });
    this.inventory.seedStock('p3', { W1: 5, W2: 5, W3: 5 });
  }
}
