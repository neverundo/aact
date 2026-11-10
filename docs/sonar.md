# SonarQube

Local analysis targets the **SonarQube Community** instance on [http://localhost:9000](http://localhost:9000) (container name `sonarqube` by default). MariaDB is never used for SonarQube.

Optional Compose profile (`make sonar-up`) can bring up a pinned `sonarqube:25.5…-community` + PostgreSQL 16 for an isolated AACT stack. If you already have Community on `:9000`, skip `sonar-up` and scan against that.

## Local scan

```bash
# Optional coverage for PHP (clover path is configured in infra/sonar/sonar-project.properties)
make coverage-api

# Token: http://localhost:9000 → User → My Account → Security
# Prefer root .env (gitignored): SONAR_TOKEN=squ_…
# Or export / one-shot:
SONAR_TOKEN=squ_… make sonar-scan
```

`make sonar-scan` reads `SONAR_TOKEN` from the environment, falling back to the root `.env`. It runs `sonarsource/sonar-scanner-cli:latest` on the same Docker network as the `sonarqube` container and posts to `http://sonarqube:9000`.

Token types:

- `sqp_…` **project analysis** token — only analyses the Sonar project it was created for. Align `sonar.projectKey` in `infra/sonar/sonar-project.properties` (currently `AACT`).
- `squ_…` **user** token — can create/analyse projects if the user has permissions.

If you see *not authorized to analyze this project*, either change `sonar.projectKey` to the existing project or create a user token / new project token for that key.

Overrides:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SONAR_TOKEN` | env or root `.env` | User / project token |
| `SONAR_SCANNER_IMAGE` | `sonarsource/sonar-scanner-cli:latest` | Scanner image already present locally |
| `SONAR_CONTAINER` | `sonarqube` | Container used to discover the network |
| `SONAR_NETWORK` | _(auto)_ | Force Docker network name |
| `SONAR_HOST_URL` | `http://sonarqube:9000` | URL as seen from the scanner container |

Example against a differently named server container:

```bash
SONAR_CONTAINER=my-sonar SONAR_HOST_URL=http://my-sonar:9000 SONAR_TOKEN=squ_… make sonar-scan
```

## Honest CI strategy

1. GitHub Actions run tests, static analysis, `composer audit`, `npm audit`, and upload API clover coverage (`api-coverage` job).
2. Sonar analysis is run **locally** against those reports (`make coverage-api` + `make sonar-scan`).
3. A self-hosted runner with network access to a private SonarQube may be added later.

GitHub-hosted runners cannot reach `localhost:9000` SonarQube. Do not claim a local quality gate is enforced on every PR unless a controlled self-hosted workflow exists.

Untrusted pull requests must never run on a self-hosted runner that can reach local secrets or SonarQube.
