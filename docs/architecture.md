# System Architecture

```text
Browser
  |
  v
NGINX reverse proxy (public port 80)
  |-- /                  -> frontend (NGINX static React build, port 8080)
  |-- /api/auth/*        -> auth-service (Express, port 4001)
  |-- /api/products*     -> catalog-service (Express, port 4002)
  `-- /api/orders*       -> order-service (Express, port 4003)
                            |          |          |
                            +----------+----------+
                                       |
                                       v
                          MySQL database (db_data volume)

Jenkins (separate Compose stack)
  |-- polls Git SCM
  |-- validates and builds tagged images
  |-- runs integration tests on a disposable Compose project
  |-- deploys the tested tag on main
  `-- runs a post-deploy smoke test
```

## Responsibilities

- **Frontend:** React/Vite is compiled into static assets and served by an unprivileged NGINX frontend container.
- **Authentication & Seller module:** buyer/seller registration, login, profile updates, signed JWTs with role claims, and role-checked service endpoints.
- **Catalog & Product Search module:** public keyword/category search and seller-owned create, update, list, and delete operations.
- **Order Management module:** buyers place multi-item checkouts in a transaction using database prices and locked stock; each order has a unique order number. Sellers see orders containing their listings and update only fulfillment status for their own items.
- **MySQL:** users, products, orders, and order items. The `db_data` named volume preserves data; `db-migrate` upgrades existing volumes before the APIs start.
- **Reverse proxy:** the public HTTP entry point; forwards API paths to their service and other paths to the frontend.
- **Jenkins:** validates code, builds versioned images, checks an isolated deployment with an end-to-end API test, and deploys only the default `main` branch.

The active backend modules are the three independent services under `services/`. For local feature development, the root `npm run dev` starts those services and the Vite frontend; the frontend development proxy routes API calls to the service ports.

Product reads are public so visitors can browse the catalog. Listing changes require a seller JWT and are scoped to that seller's user ID. Seller fulfillment updates operate on their own order items rather than changing other sellers' items in the same checkout.

## Assignment rubric mapping

- Three independently containerized application services: auth, catalog, and order.
- Frontend, database, and reverse proxy are separate containers.
- Backend services expose `/health` for container health checks.
- MySQL data persists in the named `db_data` volume.
- The `db-migrate` service upgrades existing persistent volumes without deleting their data.
- `.env` is ignored by Git; `.env.example` is the shareable development template.
- Jenkins stores its own state in `jenkins_home` and requires database/JWT values in Jenkins Credentials.
- A tagged image can be redeployed by Jenkins using the `ROLLBACK_BUILD` parameter, provided the image remains on that Docker host.
