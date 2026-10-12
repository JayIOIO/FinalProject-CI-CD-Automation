# Team Build, CI/CD, and Final Demonstration Guide

This guide turns the **SYSIN Final Project Guidelines** into a practical plan for a five-person team working with this EcomApp repository. It covers the work from team setup through the final presentation, assigns clear ownership, gives commands for Windows PowerShell, defines evidence, and points out requirements that must be demonstrated rather than merely described.

## 1. Know what the assignment requires

The project is graded mainly on containerization, orchestration, automation, teamwork, documentation, and a live demonstration—not on the number of shopping features. The team's goal is to show a reproducible path from a real Git change to a tested, built, deployed application.

### Mandatory gates

Treat these as release-blocking requirements:

- At least three application modules run in containers; at least one reads from and writes to the database.
- Each module written by the team has its own Dockerfile; the full application starts with Docker Compose.
- Jenkins runs in a container, in a separate Compose file, with persistent `jenkins_home`.
- A declarative `Jenkinsfile` is in the application repository.
- A push to the repository automatically triggers the pip .
eline. Clicking **Build Now** is not proof of an automatic trigger.
- The pipeline tests before deploying. A failed test must prevent deployment.
- Database records survive a restart/redeployment because they use a named volume.
- All five members participate and can explain the system; the guidelines also expect meaningful commits from all five members.

### Grading at a glance

| Criterion | Weight | Evidence the team should prepare |
|---|---:|---|
| Architecture and design | 10 | Diagram matches actual services, ports, networks, volumes, and request paths; stack choices are justified. |
| Dockerfiles and images | 10 | Custom Dockerfiles, reproducible builds, and explanations of image choices and security practices. |
| Compose orchestration | 10 | One-command startup, health/dependency checks, network, secrets configuration, and a persistence proof. |
| Jenkins CI/CD | 20 | Jenkins in Docker, pipeline stages, credentials, image tags, trigger, and a real successful run. |
| Automatic deployment demonstration | 15 | Push triggers without manual build, visible change deploys, broken test blocks deploy, and rollback is shown. |
| Application modules | 10 | Three or more cooperating modules, database read/write, health checks, and automated tests. |
| Documentation | 10 | Accurate README, 8–15-page technical document, setup steps, screenshots, and evidence. |
| Presentation | 10 | 10-minute presentation, all five speak, clear visuals, explains why as well as what. |
| Teamwork and process | 5 | Meaningful work by all members, checkpoints, branches/PRs, and contribution evidence. |

There is also an individual Q&A score (15% of the final grade) and peer evaluation (15%). Every teammate should understand the overall request flow and pipeline, not only their assigned files.

## 2. Understand this repository before dividing work

This repository already contains the implemented marketplace and deployment stack. Treat it as the team's shared codebase to understand, verify, document, and improve—not as permission to claim that the team performed work it did not do. If your group must demonstrate a build process, use genuine issues, tasks, commits, reviews, and evidence from the work your members actually complete.

### Current application and request flow

```text
Browser
  |
  v
NGINX proxy (host port 80 by default)
  |-- /                  -> React frontend
  |-- /api/auth/*        -> authentication service
  |-- /api/products*     -> catalog/search service
  `-- /api/orders*       -> order service
                               |
                               v
                        MySQL (db_data volume)

Jenkins (separate Compose project/file)
  |-- polls the Git SCM every five minutes
  |-- tests and builds tagged images
  |-- runs the isolated integration test
  `-- deploys main and verifies the proxy
```

| Component | Location | Responsibility |
|---|---|---|
| Frontend | `frontend/` | React buyer and seller experiences; calls the API through `/api`. |
| Authentication service | `services/auth-service/` | Buyer/seller registration, login, and JWT authentication. |
| Catalog service | `services/catalog-service/` | Public product search and seller-owned inventory. |
| Order service | `services/order-service/` | Buyer checkout/history and seller fulfillment updates. |
| Database | `db/` | MySQL schema and seed data; Compose named volume stores runtime data. |
| Proxy | `proxy/` | NGINX single host entry point and API routing. |
| Application orchestration | `docker-compose.yml` | Database, migration, application services, proxy, and test profile. |
| Jenkins orchestration | `infra/jenkins/docker-compose.yml` | Jenkins container and persistent Jenkins home, separate from the application. |
| Pipeline | `Jenkinsfile` | Checkout, tests, image build, integration test, main-branch deployment, and verification. |
| Automated marketplace check | `scripts/api-smoke-test.js` | Role, listing/search, multi-seller checkout, and fulfillment flow. |

The application stack uses MySQL, React, Express, NGINX, and Docker Compose. Be ready to explain why each is suitable for this demo and how a request reaches the database.

### Be accurate about the current verification state

- The Jenkinsfile uses **Poll SCM every five minutes** (`H/5 * * * *`). A push-triggered run still needs to be observed on the configured Jenkins job; a manual run alone does not satisfy the automatic-trigger requirement.
- Image tags use Jenkins build numbers. Rollback is a Jenkins build parameter, `ROLLBACK_BUILD`.
- The marketplace integration test can be run locally in a disposable Compose project.
- The frontend currently does not visibly display the Jenkins build number/version. The guideline's live demo requires a visible version/build label and a visible code change. Assign this as a genuine small UI change, merge it through the team's normal review process, and verify that the image deployed by Jenkins contains that label before promising this demo step.
- Jenkins credentials, an automatically triggered run, the failed-test gate demonstration, persistence demonstration, rollback, all-five-member commit history, and the course's required technical-document PDF/slides are not proven just because files or pipeline stages exist. Capture actual evidence for each.

## 3. Phase 0 — Prepare the team and machines

### Project Lead: create the shared working agreement

1. Confirm the GitHub repository URL, default branch, instructor access requirement, deadline, 10-minute presentation limit, and Q&A arrangements.
2. Confirm each member's name, GitHub username, role, and backup contact.
3. Add all five members and the instructor/evaluator to the repository as required by the course (or make the repo public if that is permitted).
4. Create a GitHub Project board. Use `Backlog`, `Ready`, `In progress`, `Review`, and `Done`; create one role issue per teammate plus cross-team integration issues.
5. Put one owner, one reviewer, a due date, acceptance criteria, and an evidence link on each issue.
6. Agree to short check-ins. At each check-in, each person answers: What changed? What evidence exists? What is blocked? What is the next handoff?

### Every member: clone and verify tools

Install Git and Docker Desktop with the Linux container backend enabled. On Windows, enable WSL 2 if Docker Desktop requests it. Eight GB of memory is recommended by the assignment; Jenkins plus the application can be resource-intensive.

```powershell
git --version
docker version
docker compose version
docker run hello-world
```

Each command must complete successfully before the team's first build checkpoint.

Clone the actual course repository:

```powershell
git clone <REPOSITORY-URL>
Set-Location <REPOSITORY-FOLDER>
git switch main
git pull
```

Replace `main` if the GitHub repository uses a different default branch. Check that the repository is clean and that the current branch is the expected one:

```powershell
git status
git branch --show-current
```

### Environment and secret handling

At the repository root, create a local `.env` only if one does not already exist:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Use private local values for a private demo. Do not paste `.env` values, database passwords, JWT secrets, or complete bearer tokens into Git, chat, issues, screenshots, or slides. Commit the placeholder template `.env.example`, never `.env`.

**Checkpoint 0:** all five members can clone the repository and run the tool checks; team roles and repository access are recorded.

## 4. Phase 1 — Plan, propose, and define done

Before changing code, the Project Lead runs a short planning session. The course proposal should record:

- Group name, all members, and one primary role per member.
- Application idea: a small e-commerce marketplace for buyers and sellers.
- Modules and ownership: frontend, authentication, catalog, orders, database, proxy, and CI/CD.
- Stack choice with one-sentence justification for each technology.
- First architecture diagram: services/containers, ports, networks, volumes, and request paths.
- Repository link, current default branch, task board, checkpoints, and presentation date.
- Acceptance evidence for each course requirement.

Do not make the diagram prettier than the truth: use the actual running system, including the separate Jenkins Compose deployment and the database volume. The evaluator should be able to match each box to a real service or file.

### Team task breakdown

Use this table as the initial board seed, then turn each row into an owned GitHub issue:

| Role | Assigned teammate |
|---|---|
| Project Lead / Scrum Master | Salenga |
| DevOps / CI-CD Engineer | Riboroso |
| Infrastructure Engineer | Tato |
| Backend & Database Engineer | Riboroso |
| Frontend, QA & Documentation Lead | Ash |

| Work item | Primary owner | Required review/handoff | Acceptance evidence |
|---|---|---|---|
| Requirements map, task board, proposal, contribution log | Project Lead | All members confirm role and acceptance criteria | Proposal, board, dated contribution log |
| Architecture diagram, Dockerfiles, Compose, proxy, health checks | Infrastructure Engineer | Backend confirms ports/env; DevOps confirms Jenkins deploy configuration | Diagram plus healthy `docker compose ps` |
| APIs, schema, migrations, seed, backend tests | Backend & Database Engineer | Frontend and Infrastructure review API/config contract | Passing tests and tested API workflow |
| Buyer/seller UI, smoke test, README and technical document | Frontend, QA & Documentation Lead | Backend verifies API use; all members verify reproducibility | QA checklist, frontend build, docs |
| Jenkins image/setup, credentials, trigger, Jenkinsfile | DevOps / CI-CD Engineer | Infrastructure checks Docker networking/daemon; Lead verifies evidence | Automatic run URL, Stage View, gate and rollback evidence |
| Integration rehearsal, rubric checklist, final presentation | Project Lead coordinates; all five contribute | All five rehearse | Timed demo recording/notes and completed checklist |

Tasks can cross role boundaries. The named owner coordinates delivery; it does not prevent another teammate from contributing or reviewing.

**Checkpoint 1:** proposal, task board, architecture draft, and a realistic schedule are accepted by all five teammates.

## 5. Phase 2 — Understand and build the application modules

The current implementation already has more than the three modules required by the course. During a rebuild or review, keep interfaces agreed before parallel changes:

| Module | Example route(s) | Acceptance test |
|---|---|---|
| Authentication | `POST /api/auth/signup`, `POST /api/auth/login` | Buyer and seller roles register/login; protected requests enforce the role. |
| Catalog | `GET /api/products?search=...&category=...`, seller inventory routes | Public search works; seller can manage only their own listings. |
| Orders | `POST /api/orders`, `GET /api/orders`, seller status routes | Buyer checkout uses database price/stock and creates a unique order number; sellers update only their own items. |
| Frontend | `/` | Browser can exercise buyer and seller journeys through the proxy. |
| Database | MySQL tables in `db/init.sql` plus migration | Schema, seeded data, and runtime writes work; data persists in the named volume. |

Each backend module exposes `/health`; Compose health checks use these endpoints to sequence startup. Agree on route names, request/response fields, authentication requirements, error behavior, and the owner of schema changes before parallel implementation.

### If a real code change is needed

Do not edit the shared default branch directly. Start from the latest default branch:

```powershell
git switch main
git pull
git switch -c <role-or-task-branch>
```

For example, to address the assignment's visible build-label requirement, create an issue with acceptance criteria, implement a label that can be verified after redeployment, test it, and submit a PR. A useful acceptance criterion is: "After a new Jenkins image is deployed, the browser visibly identifies the running build/version; the label changes after a successful push-triggered deployment."

Use the project package scripts and targeted checks. For backend services, check `services/<service>/package.json` and run its test script. For the frontend:

```powershell
Set-Location frontend
npm ci
npm run lint
npm run build
Set-Location ..
```

Only install dependencies when a manifest has changed or validation reports a missing package.

### Safe integration rules

- One issue/branch should make one coherent change; name branches by role/issue, e.g. `feature/catalog-search`.
- Add tests for behavior changes, especially authorization, seller ownership, stock/price computation, and migrations.
- Do not let separate branches make incompatible changes to the same schema/API contract without coordinating first.
- Open a PR that states the issue, behavior changed, exact checks run, and any remaining limitation.
- Require a teammate review. Merge only after required checks pass.
- A role doing verification or documentation must report the work honestly; do not invent code changes just to create commits.

**Checkpoint 2:** modules build, backend health endpoints answer successfully, tests cover relevant behavior, and the module owners agree on the integration contract.

## 6. Phase 3 — Containerize every module

The Infrastructure Engineer owns this phase with module owners providing build/runtime requirements.

For each custom module, review or create:

- A Dockerfile based on a pinned, appropriate base image (avoid `latest`).
- A `.dockerignore` that excludes local dependencies, build output, secrets, and unrelated files.
- Dependency installation before copying frequently changing source when appropriate, for layer caching.
- A non-root runtime user when supported by the image and app.
- A health check or application health endpoint used by orchestration.
- Clear build context, exposed/internal port, command, and required environment variables.
- A testable, repeatable build.

The guideline recommends multi-stage builds and a Docker test stage where practical. Explain any deliberate difference rather than claiming the project uses a practice it does not.

Build the application images:

```powershell
docker compose build
```

If an image fails, inspect the first failing build step and correct the cause. Do not proceed to the Compose checkpoint with a knowingly broken image.

**Checkpoint 3:** every custom module image builds; health endpoints respond once the corresponding service starts.

## 7. Phase 4 — Orchestrate with Docker Compose

The application Compose file is at the repository root. It defines MySQL, a migration step, authentication/catalog/order services, frontend, proxy, and an optional test-profile service.

### Start the development/demo application

From the repository root:

```powershell
docker compose up -d --build
docker compose ps
```

Wait until MySQL, migration, backend services, frontend, and proxy are in their expected healthy/completed states:

```powershell
docker compose ps
docker compose logs --tail 100
```

Open and verify:

- Frontend: `http://localhost/`
- Public product API: `http://localhost/api/products`
- Backend health endpoints are internal Compose services; use `docker compose exec` or logs rather than exposing backend/database ports to the host.

The proxy should be the only service publishing the application to the host. Compose uses a user-defined network and a named `db_data` volume. Explain that the database lives in the volume, not in a disposable container's writable layer.

### Demonstrate persistence safely

Use the shared demo stack, create a test account/listing/order, then restart without deleting volumes:

```powershell
docker compose down
docker compose up -d
docker compose ps
```

Sign in again and verify the record still exists.

**Never use `docker compose down -v` on the shared demo stack.** The `-v` option deletes its named database volume and data. It is allowed only for a disposable test project whose data is intentionally temporary.

### Database inspection is optional for normal app use

Users do not need to open MySQL to use the website. For a database demonstration, connect through the container:

```powershell
docker compose exec db mysql -uapp_user -p ecommerce_db
```

Enter the local `DB_PASSWORD` at the prompt. Then use read-only inspection queries:

```sql
SHOW TABLES;
SELECT id, name, email, role FROM users;
SELECT order_number, customer_name, total_amount, status FROM checkout_orders;
SELECT order_id, seller_id, product_id, quantity, status FROM order_items;
```

Do not expose unnecessary personal data or credentials in screenshots.

**Checkpoint 4:** one Compose command starts the complete application; the browser/API work through the proxy; service health, network, and volume are explainable; data survives `down`/`up` without `-v`.

## 8. Phase 5 — Set up Jenkins separately

The DevOps / CI-CD Engineer leads this phase. The Jenkins stack is under `infra/jenkins/` and has a persistent `jenkins_home` volume. It is intentionally separate so application deployment cannot redeploy Jenkins itself.

### Start Jenkins

From the repository root:

```powershell
docker compose -f infra/jenkins/docker-compose.yml up -d --build
docker compose -f infra/jenkins/docker-compose.yml ps
```

Open `http://localhost:8081`. Complete the first-run unlock/setup using Jenkins's displayed instructions. Install or verify Pipeline and Git SCM support as needed. The repository's Jenkins image includes the Docker CLI/Compose plugin and mounts the host Docker socket so jobs can build and run containers.

The Docker socket grants Jenkins significant control over the Docker host. Use this course setup only on a trusted development/demo machine; do not present it as a hardened multi-tenant production arrangement.

### Configure credentials

In **Manage Jenkins → Credentials → System → Global credentials**, create three **Secret text** credentials with these exact IDs:

| Credential ID | Value |
|---|---|
| `ecommerce-db-password` | Private app database password |
| `ecommerce-mysql-root-password` | Private MySQL root password |
| `ecommerce-jwt-secret` | Long, random signing secret |

The Jenkinsfile references these IDs. Never put secret values in the Jenkinsfile, GitHub, screenshots, or slides.

### Create the Jenkins job from the repository

1. Create a Pipeline job configured to load the `Jenkinsfile` from the real Git SCM, or a Multibranch Pipeline configured for the repository.
2. Set the repository URL and actual default branch (`main` in the current Jenkinsfile). For a private repository, add a Jenkins SCM credential and select it in job configuration; do not embed a personal access token in source.
3. Ensure Jenkins can reach the Git server and Docker daemon.
4. Save the job and run a first build to validate setup. This first manual run is setup validation only; it is not evidence of an automatic trigger.
5. Check the stage view, console log, and credential masking. Resolve failures before proceeding.

The application deploys on host port 80 by default; ensure it is available on the Jenkins Docker host. The Jenkins container and application containers must share access to the same Docker daemon for the configured local-image deployment model.

**Checkpoint 5:** Jenkins persists across a restart, can read the repository, uses the required credentials, and can run the pipeline's Docker commands.

## 9. Phase 6 — Prove automatic CI/CD

The current Jenkinsfile uses `pollSCM('H/5 * * * *')`: Jenkins checks the configured SCM on an approximately five-minute interval. This is the project's current automatic trigger. The assignment also allows a webhook, which can react faster but requires a reachable Jenkins endpoint and correct GitHub webhook configuration.

### Prove the configured Poll SCM trigger

1. Confirm the Jenkins job is configured from the correct Git repository and branch, and that polling is enabled by the Jenkinsfile/job.
2. Start from a passing build and note its build number, deployed version, and current browser page.
3. Make a small, visible, reviewed change on a branch that the job actually monitors. For the final demonstration, use the default/deployment branch after the team's PR review and merge.
4. Commit and push the change:

   ```powershell
   git status
   git add <changed-files>
   git commit -m "Show deployed application build version"
   git push
   ```

5. Do **not** click **Build Now**. Wait for the polling interval and show Jenkins starting the pipeline because it detected the push.
6. Show the `Checkout`, `Test`, `Build Images`, `Integration Test`, `Deploy`, and `Smoke Test / Verify` stages passing.
7. Refresh the browser and show the visible change/version is now deployed.
8. Capture the job URL, run/build number, stage view, and browser proof with credentials and user data hidden.

If a webhook is selected instead, configure GitHub's push-event webhook to the reachable Jenkins webhook endpoint and demonstrate a real push-triggered run. A Jenkins running only on a private laptop is not reachable by GitHub without an approved tunnel or network setup. Do not claim webhook behavior if only Poll SCM is configured.

**Checkpoint 6:** the team has observed a push-triggered run without pressing **Build Now**, and can explain the trigger and pipeline result.

## 10. Phase 7 — Test quality gate, persistence, and rollback

These are required live proofs, not just things to point out in a file.

### A. Test the quality gate without risking the demo

1. Start from a passing deployment and record its visible version/build number.
2. Use a temporary test branch or approved staging environment. Introduce a deliberate test failure that fails in the pipeline's `Test` stage. Do not make a destructive or unreviewed change on the only demo branch.
3. Commit and push. Allow the configured trigger to start the pipeline; do not click **Build Now** for the trigger demonstration.
4. Show Jenkins marks `Test` failed and skips all deploy stages.
5. Verify that the running application remains on the previous passing version.
6. Revert the deliberate failure on that branch or with a reviewed revert commit, push it, and show the passing pipeline again.
7. Preserve the console/stage evidence for both failing and passing runs.

Never leave a deliberately failing commit on the final deployment branch or in the submitted final state.

### B. Run marketplace integration tests safely

The `smoke-test` exercises buyer/seller roles, seller listing ownership, catalog search, multi-seller checkout, and fulfillment updates. It writes records, so use an isolated Compose project and throw away only that project's data:

```powershell
$env:COMPOSE_PROJECT_NAME = "ecomapp-qa-$PID"
$env:FRONTEND_PORT = "0"
try {
    docker compose up -d --build
    if ($LASTEXITCODE -ne 0) { throw "Could not start isolated QA stack" }
    docker compose --profile test run --rm smoke-test
    if ($LASTEXITCODE -ne 0) { throw "Marketplace smoke test failed" }
}
finally {
    docker compose down -v --remove-orphans
    Remove-Item Env:COMPOSE_PROJECT_NAME -ErrorAction SilentlyContinue
    Remove-Item Env:FRONTEND_PORT -ErrorAction SilentlyContinue
}
```

This command uses a unique project name so the smoke test does not write to the normal demo database. Here, and only here, `down -v` deletes the disposable QA volume created by this command. Do not run it in the shared stack's project context.

### C. Prove persistence after redeployment

Create a test record in the demo, capture a safe before view, redeploy/restart the app without removing `db_data`, and show the same record remains. For a restart:

```powershell
docker compose down
docker compose up -d
docker compose ps
```

The test is only valid if the same named `db_data` volume is retained.

### D. Prove rollback

The Jenkinsfile accepts a prior successful Jenkins build number in `ROLLBACK_BUILD`. Record a known-good build before the demo. In Jenkins, start a run with that parameter set to the previous successful numeric build; verify that the previous image tag is deployed and that the post-deploy proxy check passes.

Rollback depends on the tagged images still being present on the same Docker host. Explain that this demonstration rolls back application images; it is not database rollback and does not replace a registry/production migration strategy.

**Checkpoint 7:** the team has captured a real failed-test gate, a passing recovery, persistent data after restart/redeploy, and a successful prior-image rollback—or has explicitly documented any limitation rather than claiming success.

## 11. Responsibilities and detailed role checklists

Each person is the primary owner for their role's deliverables and must also review the whole architecture and rehearse the whole demo.

### Role 1 — Project Lead / Scrum Master

**Owns:** project proposal, task board, timeline, repository coordination, final demo flow, and contribution log.

1. Translate every mandatory gate and rubric row into an issue/checklist item with one owner, reviewer, due date, and measurable acceptance criteria.
2. Lead checkpoints at the end of each phase and record decisions/blockers.
3. Make sure each member has an appropriately scoped task and real, reviewable contribution.
4. Track dependencies: API/schema agreement precedes UI integration; Compose health/routing precedes end-to-end demo; passing tests precede deployment proof.
5. Verify that PRs, approvals, merges, and issue closures link to evidence.
6. Keep a rubric matrix that says `not started`, `in progress`, `verified`, or `blocked`; only use `verified` when the evidence exists.
7. Schedule at least two complete rehearsals on the presentation machine. Time each segment and assign a fallback speaker for technical interruptions.
8. Keep known gaps visible. Do not conceal a missing automatic trigger, failed test, or missing rollback proof.

**Evidence:** proposal, board and issues, dated decisions/check-ins, all-member contribution log, completed rubric matrix, timed run-through notes.

**Done when:** every requirement is owned and evidence-backed; all five members have a real speaking part; submission and demo fit the course constraints.

### Role 2 — DevOps / CI-CD Engineer

**Owns:** Jenkins setup, credentials, SCM trigger, Jenkinsfile, pipeline troubleshooting, image-tag evidence.

1. Start and configure Jenkins as described above; confirm `jenkins_home` persistence.
2. Create the three exact Secret text credentials and confirm the Jenkinsfile resolves them without revealing values.
3. Configure Git SCM for the right repository and monitored branch.
4. Run the initial manual setup build; inspect the whole console output and fix setup problems.
5. Prove the real automatic trigger with a pushed change and no manual build click.
6. Explain what `Checkout`, `Test`, `Build Images`, `Integration Test`, `Deploy`, and `Smoke Test / Verify` do, and which stages run only on `main`.
7. Show a failing `Test` stage blocks deployment and leaves the previous app running.
8. Show image tags correspond to Jenkins build numbers and perform a rollback to a known-good tag.
9. Confirm the post section reports pipeline status and capture successful and failed Stage Views.
10. If networking, credentials, or host port 80 prevents the pipeline, file an issue and fix it before claiming CI/CD completion.

**Evidence:** Jenkins configuration with secrets hidden; job/repository trigger settings; run URLs; Stage View; successful, failed-gate, recovery, and rollback logs.

**Done when:** the team can prove the push-to-deploy lifecycle, quality gate, tagged images, and rollback using actual Jenkins runs.

### Role 3 — Infrastructure Engineer

**Owns:** architecture diagram, custom Dockerfiles, app Compose stack, NGINX routes, service network, volume, and health checks.

1. Map each application module to its Dockerfile, internal port, environment, health check, and Compose service.
2. Review pinned base image versions, `.dockerignore` files, caching, runtime user, and image contents. Record justified deviations from the rubric's ideal practices.
3. Confirm Compose starts MySQL before migration, migration before APIs, and APIs before the frontend/proxy as intended.
4. Verify only the proxy publishes the application port; the database and backend APIs are internal.
5. Validate NGINX routes from the browser and public API.
6. Explain Docker image versus container, user-defined network, named volume, health status, restart behavior, and environment configuration.
7. Run persistence proof safely without `-v` on the shared stack.
8. Ensure Jenkins deployment targets the same Docker daemon and check conflicts on host port 80.
9. If a change is needed, work on a branch, add checks, and submit a PR.

**Evidence:** accurate architecture diagram, Dockerfiles/Compose explanation, `docker compose ps`, proxy screenshots/API result, named-volume proof, persistence before/after.

**Done when:** another teammate can start the stack from a fresh clone, all relevant services become healthy, and traffic/persistence are explainable.

### Role 4 — Backend & Database Engineer

**Owns:** API/service behavior, database schema and migration, seed data, backend tests, and backend-to-database evidence.

1. Walk through authentication, catalog, and order services and identify their health endpoints and API contracts.
2. Explain key tables and relationships in `db/init.sql`, the migration path for an existing volume, and why initialization SQL alone does not migrate an already initialized MySQL data directory.
3. Verify public search, seller-only listing management, ownership enforcement, buyer checkout/history, and seller fulfillment.
4. Verify checkout uses database prices and stock, uses a transaction, and returns a unique `ORD-...` number.
5. Verify a seller cannot update another seller's order items and a buyer cannot access seller-only routes.
6. Run backend test scripts and the isolated integration smoke test; preserve output with tokens/emails redacted.
7. Inspect database records only when needed for the demonstration; never expose credentials or unnecessary personal details.
8. Coordinate any schema/API contract changes with Frontend and Infrastructure before merge.

**Evidence:** test output, API results, buyer/seller authorization checks, order number/fulfillment flow, schema explanation, safe database query and retained-record proof.

**Done when:** core business behavior, ownership boundaries, migration, tests, and data persistence have all been verified.

### Role 5 — Frontend, QA & Documentation Lead

**Owns:** user-facing module, smoke-test coordination, README/technical documentation, QA checklist, slides.

1. Run the buyer journey: register/login, search, add a product to the cart, check out, and view order history/status.
2. Run the seller journey: register/login, create/edit/delete an eligible listing, and update fulfillment status.
3. Confirm error responses are visible and understandable; refresh and role switching do not break navigation.
4. Add/coordinate a visible build/version label if the team accepts the assignment-required change; verify the deployed value changes after a push-driven release.
5. Run frontend checks (`npm run lint`, `npm run build`) and the isolated marketplace smoke test.
6. Keep the README accurate to the current repo and include prerequisites, stack/Jenkins startup, trigger setup, team roles, and limitations.
7. Produce the course technical documentation PDF at **8–15 pages** with the required contents below.
8. Prepare **12–20 slides**, incorporate safe screenshots, avoid secrets, and coordinate speaking time with all members.
9. Run setup instructions from a clean clone or fresh folder to catch assumptions.

**Evidence:** browser screenshots/video, completed QA checklist, lint/build/smoke output, README, technical PDF, slide deck, build-label before/after.

**Done when:** a new teammate can reproduce setup, both roles' UI flows work, and the docs/presentation accurately reflect the tested system.

## 12. Branch, review, and contribution workflow

Use this workflow for actual work. If the application is already merged and a role is only checking it, document the verification; do not manufacture a branch, PR, or contribution.

```powershell
git switch main
git pull
git switch -c <role-or-task-branch>
```

After editing:

```powershell
git status
git diff --check
```

Run the narrow checks covering the change. Then commit and push:

```powershell
git add <changed-files>
git commit -m "<short, truthful description>"
git push -u origin <role-or-task-branch>
```

Open a PR to the repository's default branch. Include:

- Linked issue and requirement addressed.
- Summary of behavior/configuration/documentation changed.
- Exact commands/checks run and their results.
- Screenshots/logs only when useful; redact credentials, tokens, and personal data.
- Known limitations or migration implications.

Another teammate reviews it. Fix requested changes, confirm required checks pass, and merge. Update the issue with the PR/commit and proof before closing it.

### Contribution log template

Keep a dated record in the task board or required submission documentation:

| Date | Member | Role/task | Issue/PR/commit link | Work actually performed | Verification/evidence |
|---|---|---|---|---|---|
| YYYY-MM-DD | Name | Example: seller inventory QA | Link | Exact test or change | Link to output/screenshot |

The grading guide expects all five members to have meaningful repository commits. If course rules allow non-code work to be recorded separately, retain that evidence too; do not attribute someone else's commit to a teammate.

## 13. Required final documentation and submission package

The assignment calls for:

1. **Project proposal:** members/roles, app idea, modules, justified stack, draft architecture, repository link.
2. **Git repository:** source, custom Dockerfiles, application `docker-compose.yml`, root `Jenkinsfile`, `.env.example`, `.gitignore`, README, and required docs. Add the instructor as collaborator or make the repository public if course policy permits.
3. **README:** project description, actual architecture, prerequisites, how to start the app and Jenkins, trigger setup, team members/roles, and limitations.
4. **Technical documentation PDF, 8–15 pages**, containing:
   - Title page, group, members, and roles.
   - Project description and module responsibilities.
   - Architecture diagram and explanation (containers, ports, networks, volumes, request flow).
   - Technology table with justification for every choice.
   - Dockerfile explanations (base image, layers, multi-stage/testing and security choices).
   - Compose services, dependencies, health checks, networks, volumes, and environment variables.
   - Jenkins installation, plugins, credentials handling, and trigger configuration.
   - Pipeline stages, failure behavior, and Stage View screenshot.
   - Testing strategy and proof that a failing test blocks deployment.
   - Rollback process and persistence evidence.
   - Problems encountered and how they were solved.
   - Individual contributions and references.
5. **Presentation slides, 12–20**, following the course presentation outline and showing genuine project evidence.
6. **Live demo:** automatic push-triggered deployment, failed-test gate, persistence, and rollback.

Do not mark deliverables complete merely because the guide describes them. Save the actual files/runs/screenshots where your instructor can access them.

## 14. Presentation and live demonstration

The course allows **10 minutes to present plus 5 minutes for Q&A**. All five members must speak. Start Docker and Jenkins before the presentation slot; do not spend demo time downloading/building base images. Rehearse on the exact machine/network to be used and keep a backup recording/screenshots in case connectivity fails.

### Required live demo order

This sequence follows the assignment:

1. **Running system:** show `docker compose ps`; open the app through the reverse proxy; identify the visible version/build label.
2. **Visible code change:** make/use an approved small change, commit, and push it to the monitored repository branch.
3. **Automatic pipeline:** do not click **Build Now**; show Jenkins detect the push and start the pipeline. Explain each stage.
4. **Deployment:** refresh the browser and show the visible change and new build/version.
5. **Quality gate:** push the prepared test-breaking commit; show `Test` fails, deploy is skipped, and the previously deployed app remains available. Revert/fix and show a passing run.
6. **Persistence:** show a record created earlier is still present after the successful redeployment/restart.
7. **Rollback:** redeploy the selected earlier image tag/build and verify the app through the proxy.

For the current project, Poll SCM can take up to about five minutes to notice a push. Explain this to the audience and allow for the wait; a manual build is not a substitute. Keep pre-captured evidence as backup, but distinguish backup evidence from a live demonstration.

### Suggested speaking split (adjust to exactly 10 minutes)

| Speaker | Time | Content |
|---|---:|---|
| Project Lead | 1:00 | Project goal, requirement map, team roles, and contribution workflow. |
| Infrastructure Engineer | 1:30 | Diagram, containers, proxy/request path, health checks, network, and volume. |
| Backend & Database Engineer | 1:30 | Auth/catalog/order modules, database relationships, and business flow. |
| Frontend, QA & Documentation Lead | 1:30 | Buyer/seller journeys, QA evidence, and documentation. |
| DevOps / CI-CD Engineer | 2:30 | Automatic trigger, stage flow, successful deploy, gate, image tags, rollback. |
| Project Lead + all | 2:00 | Persistence result, lessons/limitations, rubric close, handoff to Q&A. |

All five should answer at least one practice question. Possible Q&A questions:

- What is the difference between an image and a running container?
- Why does the database use a named volume, and what would `down -v` do?
- Why is only the proxy published to the host?
- How does Compose know the database/API is ready?
- What happens when the automated test fails?
- How does the Git push trigger this particular Jenkins job?
- Where are deployment secrets stored?
- How are an order's price and stock validated?
- How does a seller's ownership of a listing/order item get enforced?
- What exactly does rollback restore, and what does it not restore?

## 15. Final readiness checklist

### Repository and teamwork

- [ ] Repository is accessible to the evaluator; default branch and contribution history are accurate.
- [ ] Every member has a primary role, a real owned task, a meaningful contribution, and a speaking section.
- [ ] Board/issues show owners, reviewers, status, due dates, and linked evidence.
- [ ] Branch/PR/review history reflects actual work; no fabricated activity.

### Application and infrastructure

- [ ] Three or more application modules run in separate containers.
- [ ] Application can be started with `docker compose up -d --build`.
- [ ] Custom Dockerfiles, `.dockerignore` files, image choices, health checks, user-defined network, and dependencies are explained.
- [ ] Only the reverse proxy exposes the application to the host; database data uses a named volume.
- [ ] Browser and products API work through the proxy.
- [ ] Database reads/writes work and data persists after restart without `-v`.
- [ ] Buyer/seller functionality, authorization, search, checkout, order history, and seller fulfillment are tested.

### Jenkins and automation

- [ ] Jenkins runs in Docker from its separate Compose file and has persistent `jenkins_home`.
- [ ] Root `Jenkinsfile` is loaded from the actual Git repository.
- [ ] Required credentials exist in Jenkins and are not disclosed.
- [ ] A Git push—not **Build Now**—has triggered the job.
- [ ] Successful run shows Checkout, Test, Build Images, Integration Test, Deploy, and Smoke Test / Verify as appropriate.
- [ ] A deliberately failing test blocked deployment and left the previous deployment up; the failure was reverted.
- [ ] Build-number image tags are understood and a previous successful build was redeployed for rollback.
- [ ] Jenkins post result and deployed proxy verification were captured.

### Documentation and presentation

- [ ] README was checked from a clean clone and accurately explains startup, Jenkins, and trigger configuration.
- [ ] Proposal and accurate architecture diagram are included.
- [ ] Technical documentation is 8–15 pages and contains all required sections.
- [ ] Slides are 12–20 and safe (no passwords, full tokens, or unnecessary personal data).
- [ ] All five members spoke during a rehearsal; total presentation is within 10 minutes.
- [ ] The team has tested the presentation machine, prepared a backup, and can answer whole-system questions.
- [ ] Unverified behavior and known limitations are disclosed instead of represented as completed.

## 16. Stop, troubleshoot, and clean up

If a service is unhealthy, collect status and targeted logs before changing files:

```powershell
docker compose ps
docker compose logs --tail 100 db
docker compose logs --tail 100 db-migrate
docker compose logs --tail 100 auth-service
docker compose logs --tail 100 catalog-service
docker compose logs --tail 100 order-service
docker compose logs --tail 100 proxy
```

Stop the shared application while preserving database data:

```powershell
docker compose down
```

Stop Jenkins while preserving Jenkins configuration and job history:

```powershell
docker compose -f infra/jenkins/docker-compose.yml down
```

Do not delete named volumes during ordinary cleanup. Before any destructive volume operation, identify the exact Compose project and confirm that the data is disposable and backed up or intentionally unnecessary.
