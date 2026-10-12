# EcomApp for System Architecture

A containerized e-commerce demonstration built with React, Express, MySQL, NGINX, Docker Compose, and Jenkins. The repository separates the frontend, authentication, catalog, and order functions into containers and uses NGINX as the public entry point.

The team-role tasks, evidence checklist, GitHub workflow, and demo instructions are in the [Team Execution and Demo Guide](./docs/team-execution-guide.md).

The guide maps the course requirements to project phases and five role checklists, including the required 8–15-page technical documentation PDF, 12–20 presentation slides, automatic-trigger proof, quality gate, persistence, rollback, and final demo. It also calls out project-specific items that still require a real team verification or demonstration.

## Team roles

1. Project Lead / Scrum Master — Salenga
2. DevOps / CI-CD Engineer — Riboroso
3. Infrastructure Engineer — Tato
4. Backend & Database Engineer — Riboroso
5. Frontend, QA, and Documentation Lead — Ash

## Architecture

```text
Browser
  |
  v
NGINX reverse proxy :80
  |-- /                  -> React static frontend
  |-- /api/auth/*        -> Buyer/seller auth service
  |-- /api/products*     -> Search and seller inventory service
  `-- /api/orders*       -> Buyer checkout and seller fulfillment service
                           |
                           v
                    MySQL + db_data volume

Jenkins -> validates -> builds tagged images -> integration tests
        -> deploys main -> runs post-deploy smoke test
```

More detail is in [docs/architecture.md](./docs/architecture.md).

## Repository layout

```text
.
├── Jenkinsfile
├── docker-compose.yml
├── .env.example
├── db/
│   ├── Dockerfile
│   └── init.sql
├── docs/
│   ├── architecture.md
│   └── team-execution-guide.md
├── frontend/
│   ├── Dockerfile
│   └── src/
├── infra/jenkins/
│   ├── Dockerfile
│   └── docker-compose.yml
├── proxy/
│   ├── Dockerfile
│   └── nginx.conf
├── scripts/
│   ├── Dockerfile
│   ├── api-smoke-test.js
│   └── migrate-marketplace.js
└── services/
    ├── auth-service/
    ├── catalog-service/
    └── order-service/
```

The root `backend/` folder is the original monolithic prototype and is not used by the Docker Compose deployment. The deployed backend is the three independent services under `services/`. Do not use the old monolith as evidence of the current container architecture.

## Prerequisites

- Docker Desktop with Linux containers, or Docker Engine with Docker Compose v2.
- Git.
- A GitHub repository containing this project.
- Jenkins is only needed to run the CI/CD section.

## Run locally

From PowerShell, clone the repository and enter the project directory:

```powershell
git clone <REPOSITORY-URL>
Set-Location <REPOSITORY-FOLDER>
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Review `.env` before starting. The values in `.env.example` are demo-only defaults. Change the database passwords and JWT secret for a private demo; never commit `.env` or use the demo defaults for a public or production deployment.

Build and start the application:

```powershell
docker compose up -d --build
docker compose ps
```

Wait for the database and backend health checks to pass, then open:

- Frontend: <http://localhost/>
- Products API: <http://localhost/api/products>

To stop containers without deleting database data:

```powershell
docker compose down
```

Do not use `docker compose down -v` for normal stop/restart operations. The `-v` option removes the persistent database volume.

## Application API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create a buyer or seller account (`role`: `buyer` or `seller`) |
| POST | `/api/auth/login` | Sign in and receive a JWT |
| PUT | `/api/auth/profile` | Update the signed-in user's profile |
| GET | `/api/products?search=term&category=Electronics` | Public keyword/category catalog search |
| GET | `/api/products/mine` | Seller's own inventory (seller JWT required) |
| POST | `/api/products` | Seller creates a listing |
| PUT | `/api/products/:id` | Seller updates only their own listing |
| DELETE | `/api/products/:id` | Seller deletes only their own listing if it has no order history |
| POST | `/api/orders` | Buyer checkout using a relational transaction and server-calculated prices |
| GET | `/api/orders` | Buyer's order history |
| GET | `/api/orders/seller` | Orders containing this seller's products |
| PUT | `/api/orders/:id/status` | Seller updates fulfillment status for their own order items |
| DELETE | `/api/orders/:id` | Buyer cancels a pending order and restores stock |

Signup accepts only `buyer` or `seller`; protected routes verify the JWT and enforce the required role. Seller order status is stored per order item, so one seller cannot update another seller's fulfillment status in a multi-seller checkout. Each checkout receives an opaque unique `ORD-...` number. Product prices and stock are read and locked inside the database transaction; client-provided totals are not trusted.

## Database and persistence

- `db/init.sql` creates the users, products, checkout-orders, and order-items tables and seeds demo products.
- A `db-migrate` service upgrades an existing named database volume with buyer/seller roles, product categories and ownership, unique order numbers, and per-seller order item status without deleting existing records.
- The database image copies the initialization script into MySQL's startup directory.
- The named `db_data` volume preserves MySQL data across container restarts and image rebuilds.
- Initialization SQL is applied only when MySQL initializes an empty data directory. Changing `init.sql` does not automatically migrate an existing volume.

To inspect tables interactively:

```powershell
docker compose exec db mysql -uapp_user -p ecommerce_db
```

Enter the local `DB_PASSWORD` at the prompt. Then run `SHOW TABLES;` or a read-only query. Avoid sharing database passwords, access tokens, or user data in screenshots.

## Jenkins CI/CD

Jenkins is a separate service:

```powershell
docker compose -f infra/jenkins/docker-compose.yml up -d --build
docker compose -f infra/jenkins/docker-compose.yml ps
```

Open <http://localhost:8081>. See the [Team Execution and Demo Guide](./docs/team-execution-guide.md) for the Jenkins setup, the credential IDs the pipeline requires, and the evidence to capture.

The root `Jenkinsfile` polls its configured Git SCM every five minutes, validates service JavaScript, builds tagged images (including a frontend lint and production build), tests an isolated stack end-to-end before deployment, deploys only the `main` branch, and checks the deployed catalog route through the proxy. Jenkins needs access to the same Docker daemon used for deployment.

The Jenkins job must be configured from SCM so the `pollSCM` trigger can detect new commits. For a non-`main` default branch, update the deployment branch condition in the Jenkinsfile to match the repository's actual default branch.

### Jenkins credentials

Before the first run, add three Jenkins **Secret text** credentials with these exact IDs:

- `ecommerce-db-password`
- `ecommerce-mysql-root-password`
- `ecommerce-jwt-secret`

Use strong private values; do not put credential values in source, GitHub issues, or screenshots. Jenkins Compose uses a persistent `jenkins_home` volume, so installed plugins and Jenkins configuration survive a container restart.

### Rollback

Each Jenkins build tags the application images with its Jenkins build number. To redeploy an earlier successful build, start a Jenkins run with `ROLLBACK_BUILD` set to that build number. This local rollback requires the tagged images to remain on the same Docker host; it is not a substitute for a remote image registry or database migration strategy.

## CI quality checks

- Backend service package scripts run Node's syntax check.
- The frontend Docker build runs `oxlint` and a production Vite build.
- The integration test starts an isolated Compose project, verifies buyer/seller registration and permissions, searches the catalog, creates a seller listing, checks out as a buyer, tests seller fulfillment updates, and confirms the buyer's order history. A failed check prevents the main deployment stage from running.
- Deployment is limited to the `main` branch; the post-deploy check requests the catalog through the deployed proxy without adding test data to the persistent database.

## Known scope limitations

- This is an educational demo, not a production-ready commerce service.
- Sellers can manage only their own listings and order items. There is no separate platform administrator role or moderation workflow.
- The project does not implement production payment processing.
- The startup migration handles this demo's current schema upgrade; larger production changes would require a formal migration/versioning tool.
- Jenkins rollback restores application image versions on the same Docker host; database rollback and registry-backed deployments are outside this demo's scope.
