# Scalable Shopping Cart with Deadlock Detection and 2PC

An example online shopping cart microservice built with TypeScript and Express featuring:

- Deadlock detection via a wait-for graph in an in-memory lock manager
- Inventory allocation across multiple warehouses using a 2-Phase Commit-like flow
- Cloud-ready Dockerfile and compose for easy deployment
- Simple REST API with seeded data

## Quickstart

### Local (Node 20+)
```bash
npm install
npm run build
npm start
# or during development
npm run dev
```
Server listens on `http://localhost:3000`.

### Docker
```bash
docker build -t scalable-cart .
docker run --rm -p 3000:3000 scalable-cart
```

### Docker Compose
```bash
docker compose up --build
```

## API

- GET `/health`
- GET `/api/catalog` — list products
- POST `/api/catalog` — create product `{ id, name, priceCents }`
- GET `/api/inventory/warehouses` — list warehouse ids
- GET `/api/inventory/available/:productId` — show available per-warehouse
- POST `/api/orders` — create order `{ items: [{ productId, quantity }, ...] }`

Responses include appropriate HTTP status codes:
- `201` when an order is created
- `409` when allocation fails (insufficient stock or concurrency)
- `409` specifically for deadlocks; `504` on lock timeouts

## Example
```bash
curl -s localhost:3000/api/catalog | jq
curl -s localhost:3000/api/inventory/available/p1 | jq
curl -s -X POST localhost:3000/api/orders \
  -H 'content-type: application/json' \
  -d '{"items":[{"productId":"p1","quantity":2}]}' | jq
```

## Architecture
- `services/lock` — cooperative mutex with wait-for graph; detects cycles to abort one transaction
- `services/inventory` — computes greedy allocation plan, locks all `(warehouse,product)` resources, reserves then commits
- `services/catalog` — simple in-memory product catalog
- `services/orders` — calculates totals and triggers inventory allocation

Data is in-memory for clarity; integrate with a database by replacing the stores but keeping the coordination and lock semantics. The container image is minimal and production-ready.

## Cloud Deployment
Use the provided Dockerfile on your preferred platform (e.g., AWS ECS/Fargate, GCP Cloud Run, Azure Container Apps, Fly.io). Set `PORT` as needed; the app listens on `3000` by default.
