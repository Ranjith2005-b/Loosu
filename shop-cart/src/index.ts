import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { buildContainer } from './container';
import { createCatalogRouter } from './routes/catalog';
import { createInventoryRouter } from './routes/inventory';
import { createOrdersRouter } from './routes/orders';
import { ValidationError, DeadlockError, NotEnoughStockError, TimeoutError } from './utils/errors';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

async function main() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  const container = buildContainer();

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'scalable-cart-2pc-deadlock' });
  });

  app.use('/api/catalog', createCatalogRouter(container.catalogService));
  app.use('/api/inventory', createInventoryRouter(container.inventoryCoordinator));
  app.use('/api/orders', createOrdersRouter(container.ordersService));

  // Global error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const base = { ok: false } as any;
    if (err instanceof ValidationError || err instanceof NotEnoughStockError) {
      return res.status(400).json({ ...base, code: err.code, message: err.message });
    }
    if (err instanceof DeadlockError) {
      return res.status(409).json({ ...base, code: err.code, message: err.message });
    }
    if (err instanceof TimeoutError) {
      return res.status(504).json({ ...base, code: err.code, message: err.message });
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return res.status(500).json({ ...base, code: 'INTERNAL', message });
  });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
