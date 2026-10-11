# EcomApp for System Architecture

This project is designed to satisfy the final project requirements for a containerized multi-module application with Docker and Jenkins automation.

## Team roles

- Project Lead / Scrum Master
- DevOps / CI-CD Engineer
- Infrastructure Engineer
- Backend & Database Engineer
- Frontend, QA, and Documentation Lead

## Application idea

A small e-commerce store with:
- user signup and login
- products catalog
- cart and checkout
- order history
- profile updates

## Modules

1. Frontend UI
2. Auth service
3. Catalog service
4. Order service
5. MySQL database
6. Reverse proxy

## Tech stack

- React + Vite
- Express.js
- MySQL 8
- Nginx
- Jenkins in Docker
- Docker Compose

## Repository structure

```text
project-name/
├── Jenkinsfile
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── docs/
│   └── architecture.md
├── db/
│   └── init.sql
├── proxy/
│   ├── Dockerfile
│   └── nginx.conf
├── frontend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/
├── services/
│   ├── auth-service/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   ├── package.json
│   │   └── server.js
│   ├── catalog-service/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   ├── package.json
│   │   └── server.js
│   └── order-service/
│       ├── Dockerfile
│       ├── .dockerignore
│       ├── package.json
│       └── server.js
├── infra/
│   └── jenkins/
│       ├── Dockerfile
│       └── docker-compose.yml
└── .env (local only, not committed)
```

## Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose
- Git
- Node.js 18+ for local frontend validation

## Setup

1. Copy `.env.example` to `.env`.
2. Update the `.env` values for your local environment.
3. Start the stack:

```bash
docker compose up -d --build
```

4. Open the app in a browser:

- Frontend: http://localhost/
- API routes are forwarded through the proxy at http://localhost/api/...

## Application routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `PUT /api/auth/profile`
- `GET /api/products`
- `POST /api/products`
- `POST /api/orders`
- `GET /api/orders`
- `PUT /api/orders/:id`
- `DELETE /api/orders/:id`

## Jenkins

Jenkins is set up separately in `infra/jenkins/` and runs with a persistent volume as required by the final project guidelines.

```bash
cd infra/jenkins
docker compose up -d --build
```

Then open:

- Jenkins UI: http://localhost:8081

The root `Jenkinsfile` includes the required pipeline stages:
- Checkout
- Test
- Build Images
- Deploy
- Smoke Test / Verify

## Quality gates and automation

The pipeline is designed to fail before deploy if any required check fails. This satisfies the requirement that broken code is not deployed.

## Persistence and rollback

- MySQL uses a named volume called `db_data`
- Images are tagged by the Jenkins build number pattern in the pipeline
- Previous versions can be redeployed using the tag-based workflow

## Notes

- The real environment variables live in `.env` and are not committed to Git
- `.env.example` contains safe placeholder values only
- The database schema and seed data are in `db/init.sql`
