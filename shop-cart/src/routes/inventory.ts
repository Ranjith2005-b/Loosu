import { Router } from 'express';
import { z } from 'zod';
import { InventoryCoordinator } from '../services/inventory/inventoryCoordinator';

export function createInventoryRouter(inv: InventoryCoordinator) {
  const r = Router();

  r.get('/warehouses', (_req, res) => {
    res.json({ ok: true, warehouses: inv.listWarehouses() });
  });

  r.get('/available/:productId', (req, res) => {
    const { productId } = z.object({ productId: z.string() }).parse(req.params);
    res.json({ ok: true, available: inv.getAvailableByWarehouse(productId) });
  });

  return r;
}
