import { Router } from 'express';
import { z } from 'zod';
import { CatalogService } from '../services/catalog/catalogService';

export function createCatalogRouter(catalog: CatalogService) {
  const r = Router();

  r.get('/', (_req, res) => {
    res.json({ ok: true, products: catalog.list() });
  });

  r.post('/', (req, res, next) => {
    try {
      const body = z.object({ id: z.string(), name: z.string(), priceCents: z.number().int().nonnegative() }).parse(req.body);
      catalog.create(body);
      res.status(201).json({ ok: true });
    } catch (err) { next(err); }
  });

  return r;
}
