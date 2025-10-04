import { Router } from 'express';
import { z } from 'zod';
import { OrdersService } from '../services/orders/ordersService';

export function createOrdersRouter(orders: OrdersService) {
  const r = Router();

  r.post('/', async (req, res, next) => {
    try {
      const body = z.object({ items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })) }).parse(req.body);
      const order = await orders.createOrder(body.items);
      res.status(order.status === 'CREATED' ? 201 : 409).json({ ok: true, order });
    } catch (err) { next(err); }
  });

  return r;
}
