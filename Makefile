COMPOSE ?= docker compose
API_EXEC = $(COMPOSE) exec -T api
WEB_EXEC = $(COMPOSE) exec -T web

.PHONY: setup up down migrate test test-financial test-e2e lint seed-demo coverage-api sonar-up sonar-scan build ps logs

setup:
	@test -f .env || cp .env.example .env
	@test -f apps/api/.env || cp apps/api/.env.example apps/api/.env
	$(COMPOSE) build
	$(COMPOSE) up -d mariadb redis mailpit
	@echo "Waiting for MariaDB..."
	@sleep 8
	$(COMPOSE) run --rm --no-deps api composer install --no-interaction
	$(COMPOSE) run --rm --no-deps web npm ci
	@if ! grep -q '^APP_KEY=base64:' apps/api/.env; then \
		KEY=$$($(COMPOSE) run --rm --no-deps api php artisan key:generate --show); \
		sed -i "s|^APP_KEY=.*|APP_KEY=$$KEY|" .env apps/api/.env; \
	fi
	$(COMPOSE) up -d
	$(MAKE) migrate
	@echo "AACT is up at http://localhost:$${HTTP_PORT:-18080}"

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=100

migrate:
	$(API_EXEC) php artisan migrate --force

test:
	$(API_EXEC) env APP_ENV=testing SESSION_DRIVER=array CACHE_STORE=array QUEUE_CONNECTION=sync MAIL_MAILER=array DB_CONNECTION=sqlite DB_DATABASE=:memory: php artisan test
	$(WEB_EXEC) npm run typecheck
	$(WEB_EXEC) npm run lint

test-financial:
	$(COMPOSE) exec -T mariadb mariadb -uroot -p$${DB_ROOT_PASSWORD:-root_secret} -e "CREATE DATABASE IF NOT EXISTS aact_test; GRANT ALL PRIVILEGES ON aact_test.* TO 'aact'@'%'; FLUSH PRIVILEGES;"
	$(API_EXEC) env APP_ENV=testing AACT_TEST_DB_HOST=mariadb AACT_TEST_DB_DATABASE=aact_test AACT_TEST_DB_USERNAME=aact AACT_TEST_DB_PASSWORD=$${DB_PASSWORD:-aact_secret} ./vendor/bin/phpunit -c phpunit.mariadb.xml

lint:
	$(API_EXEC) vendor/bin/pint --test
	$(API_EXEC) vendor/bin/phpstan analyse --memory-limit=1G
	$(WEB_EXEC) npm run lint
	$(WEB_EXEC) npm run typecheck

build:
	$(COMPOSE) build

seed-demo:
	$(API_EXEC) php artisan db:seed --class=Database\\Seeders\\DemoSeeder --force

test-e2e:
	@test -f e2e/package-lock.json || (cd e2e && npm install)
	@test -d e2e/node_modules || (cd e2e && npm ci)
	cd e2e && npx playwright test

coverage-api:
	mkdir -p apps/api/coverage
	$(API_EXEC) env APP_ENV=testing SESSION_DRIVER=array CACHE_STORE=array QUEUE_CONNECTION=sync MAIL_MAILER=array DB_CONNECTION=sqlite DB_DATABASE=:memory: XDEBUG_MODE=coverage php artisan test --coverage-clover=coverage/clover.xml
	# Clover paths are container-absolute (/var/www/html/…); remap for Sonar sources under apps/api/
	sed -i 's#name="/var/www/html/#name="apps/api/#g' apps/api/coverage/clover.xml

# Scanner CLI talks to whatever SonarQube Community answers on host :9000
# (container name `sonarqube` by default). Override with SONAR_* vars.
SONAR_SCANNER_IMAGE ?= sonarsource/sonar-scanner-cli:latest
SONAR_CONTAINER ?= sonarqube
SONAR_HOST_URL ?= http://sonarqube:9000

sonar-up:
	$(COMPOSE) --profile sonar up -d sonarqube sonar-db

sonar-scan:
	@TOKEN="$${SONAR_TOKEN}"; \
	if [ -z "$$TOKEN" ] && [ -f .env ]; then \
		TOKEN=$$(grep -E '^[[:space:]]*SONAR_TOKEN=' .env | tail -n1 | cut -d= -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$$//' -e 's/^"//' -e 's/"$$//' -e "s/^'//" -e "s/'$$//"); \
	fi; \
	if [ -z "$$TOKEN" ]; then \
		echo "Set SONAR_TOKEN in the environment or in .env (User > My Account > Security in http://localhost:9000)"; \
		exit 1; \
	fi; \
	NETWORK="$${SONAR_NETWORK}"; \
	if [ -z "$$NETWORK" ]; then \
		NETWORK=$$(docker inspect $(SONAR_CONTAINER) --format '{{range $$k, $$v := .NetworkSettings.Networks}}{{$$k}}{{end}}' 2>/dev/null | awk 'NF{print; exit}'); \
	fi; \
	if [ -z "$$NETWORK" ]; then \
		echo "SonarQube container '$(SONAR_CONTAINER)' not found. Start Community on :9000 or set SONAR_NETWORK."; \
		exit 1; \
	fi; \
	echo "Scanning via $(SONAR_SCANNER_IMAGE) → $(SONAR_HOST_URL) on network $$NETWORK"; \
	docker run --rm \
		--network "$$NETWORK" \
		-e SONAR_HOST_URL="$(SONAR_HOST_URL)" \
		-e SONAR_TOKEN="$$TOKEN" \
		-v "$$(pwd):/usr/src" \
		-w /usr/src \
		$(SONAR_SCANNER_IMAGE) \
		-Dproject.settings=/usr/src/infra/sonar/sonar-project.properties
	@echo "Results: http://localhost:9000/dashboard?id=AACT"
