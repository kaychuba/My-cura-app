# My-Cura — Care Management Platform

Enterprise SaaS care management platform for domiciliary care agencies and supported living organisations in the UK and US.

**Status:** Active development — Phases 1–9 scaffold complete.

---

## Architecture

| Layer | Technology |
|---|---|
| Backend API | NestJS (Node.js) — 24 feature modules |
| Database | PostgreSQL 16 with Row-Level Security (multi-tenant) |
| Cache / Queues | Redis 7 + Bull |
| Search | OpenSearch 2.14 |
| Real-time | Socket.io with Redis pub/sub adapter |
| Web App | React 18 + Vite 5 + Tailwind CSS + Radix UI |
| Mobile App | React Native (Expo SDK 51) + Expo Router |
| Cloud | AWS (ECS Fargate, Aurora PostgreSQL Serverless v2, S3, CloudFront, SES) |
| Auth | JWT (15m access + 30d refresh) + TOTP 2FA + Biometric + Google OAuth2 |
| AI | Anthropic Claude API (care summaries, MAR anomaly detection) |
| Payments | Stripe |
| Notifications | Firebase FCM |
| Infra-as-code | AWS CDK (TypeScript) |
| CI/CD | GitHub Actions + Blue/Green ECS Fargate deploy |

## Monorepo Structure

```
apps/
  api/          NestJS backend
  web/          React web dashboard (Vite)
  mobile/       React Native (Expo)
packages/
  shared-types/ TypeScript types, enums, DTOs
  shared-utils/ Haversine, date, currency, encryption, UK/US tax tables
  ui-web/       Reusable React component library
infrastructure/
  docker/       Local dev (Postgres, Redis, OpenSearch, MailHog, Stripe Mock)
  cdk/          AWS CDK stacks
.github/
  workflows/    CI, staging deploy, production deploy
```

## Key Features

- **Multi-tenancy** — PostgreSQL Row-Level Security; single schema, per-tenant data isolation
- **GPS Clock-in** — Haversine distance check (200m radius), accuracy check (50m threshold), timing window (±30min), duplicate detection
- **UK Payroll** — Cumulative PAYE, Class 1 NI (employee + employer), auto-enrolment pension, SSP, SMP, student loan
- **US Payroll** — Federal withholding (Pub 15-T annualised), SS, Medicare (+ 0.9% high-earner), FUTA, 20-state table
- **MAR** — Digital medication administration, barcode verification, e-signature, controlled drug witness, compliance charts
- **RBAC** — Role hierarchy: `super_admin` > `agency_owner` > `manager` > `care_worker` > `service_user` > `family`
- **Scheduling** — RRULE-based recurring visits, drag-drop (FullCalendar), conflict detection
- **AI Summaries** — Claude API generates weekly care summaries from visit notes + MAR data
- **Real-time** — Socket.io gateway with JWT auth, channel-based messaging, emergency broadcast, presence tracking

## Local Development

```bash
# 1. Prerequisites
brew install node@22 && npm i -g pnpm

# 2. Install dependencies
pnpm install

# 3. Start infrastructure
docker compose -f infrastructure/docker/docker-compose.yml up -d

# 4. Configure environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your keys

# 5. Run database migrations
cd apps/api && pnpm run migration:run

# 6. Start all services
pnpm run dev:api    # NestJS API on :3000
pnpm run dev:web    # Vite web app on :5173
pnpm run dev:mobile # Expo mobile app
```

### Services (docker-compose)

| Service | URL |
|---|---|
| PostgreSQL | `localhost:5432` (db: mycura, user: mycura_app) |
| Redis | `localhost:6379` |
| OpenSearch | `localhost:9200` |
| MailHog (SMTP) | `localhost:1025` / UI: `localhost:8025` |
| Stripe Mock | `localhost:12111` |

## API Documentation

Swagger UI available at `http://localhost:3000/api/docs` when running locally.

## Deployment

```bash
# Staging (auto on merge to main)
git push origin main

# Production (manual approval gate)
gh release create v1.0.0
# Then approve in GitHub Actions "Production Deploy" environment
```

## Mobile Build (EAS)

```bash
cd apps/mobile
eas build --platform ios --profile staging
eas build --platform android --profile staging
```

[Learn more about this workspace setup and its capabilities](https://nx.dev/docs/technologies/typescript/introduction?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!
## Finish your Nx platform setup

🚀 [Finish setting up your workspace](https://cloud.nx.app/connect/iZEtb0hobw) to get faster builds with remote caching, distributed task execution, and self-healing CI. [Learn more about Nx Cloud](https://nx.dev/ci/intro/why-nx-cloud).
## Generate a library

```sh
npx nx g @nx/js:lib packages/pkg1 --publishable --importPath=@my-org/pkg1
```

## Run tasks

To build the library use:

```sh
npx nx run pkg1:build
```

To run any task with Nx use:

```sh
npx nx run <project-name>:<target>
```

These targets are either [inferred automatically](https://nx.dev/docs/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/docs/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Versioning and releasing

To version and release the library use

```
npx nx release
```

Pass `--dry-run` to see what would happen without actually releasing the library.

[Learn more about Nx release &raquo;](https://nx.dev/docs/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Keep TypeScript project references up to date

Nx automatically updates TypeScript [project references](https://www.typescriptlang.org/docs/handbook/project-references.html) in `tsconfig.json` files to ensure they remain accurate based on your project dependencies (`import` or `require` statements). This sync is automatically done when running tasks such as `build` or `typecheck`, which require updated references to function correctly.

To manually trigger the process to sync the project graph dependencies information to the TypeScript project references, run the following command:

```sh
npx nx sync
```

You can enforce that the TypeScript project references are always in the correct state when running in CI by adding a step to your CI job configuration that runs the following command:

```sh
npx nx sync:check
```

[Learn more about nx sync](https://nx.dev/reference/nx-commands#sync)

## Nx Cloud

Nx Cloud ensures a [fast and scalable CI](https://nx.dev/nx-cloud?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) pipeline. It includes features such as:

- [Remote caching](https://nx.dev/docs/features/ci-features/remote-cache?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task distribution across multiple machines](https://nx.dev/docs/features/ci-features/distribute-task-execution?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Automated e2e test splitting](https://nx.dev/docs/features/ci-features/split-e2e-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task flakiness detection and rerunning](https://nx.dev/docs/features/ci-features/flaky-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### Set up CI (non-Github Actions CI)

**Note:** This is only required if your CI provider is not GitHub Actions.

Use the following command to configure a CI workflow for your workspace:

```sh
npx nx g ci-workflow
```

[Learn more about Nx on CI](https://nx.dev/docs/features/ci-features?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/docs/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## 🔗 Learn More

- [Nx Documentation](https://nx.dev/docs)
- [Crafting Your Workspace Tutorial](https://nx.dev/docs/getting-started/tutorials/crafting-your-workspace)
- [Module Boundaries](https://nx.dev/docs/features/enforce-module-boundaries)
- [Releasing Packages](https://nx.dev/docs/features/manage-releases)
- [Nx Plugins](https://nx.dev/docs/concepts/nx-plugins)
- [Nx Cloud](https://nx.dev/nx-cloud)

## 💬 Community

Join the Nx community:

- [Discord](https://go.nx.dev/community)
- [X (Twitter)](https://twitter.com/nxdevtools)
- [LinkedIn](https://www.linkedin.com/company/nrwl)
- [YouTube](https://www.youtube.com/@nxdevtools)
- [Blog](https://nx.dev/blog)
