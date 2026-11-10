# syntax=docker/dockerfile:1.7

FROM php:8.4.14-fpm-bookworm AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        git \
        libicu-dev \
        libzip-dev \
        libpng-dev \
        unzip \
    && docker-php-ext-install -j$(nproc) \
        bcmath \
        intl \
        opcache \
        pdo_mysql \
        zip \
    && pecl install redis-6.1.0 \
    && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2.8.8 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

RUN useradd --create-home --uid 1000 --shell /bin/bash app \
    && chown -R app:app /var/www/html

FROM base AS vendor

COPY --chown=app:app apps/api/composer.json apps/api/composer.lock ./
USER app
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --no-scripts \
    --optimize-autoloader

FROM base AS app

ENV APP_ENV=production \
    APP_DEBUG=false

COPY --from=vendor --chown=app:app /var/www/html/vendor ./vendor
COPY --chown=app:app apps/api/ ./

USER app
RUN php artisan package:discover --ansi \
    && php artisan event:cache \
    && php artisan route:cache \
    && php artisan view:cache

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD php -r 'exit(0);'

CMD ["php-fpm", "-F"]

FROM base AS app-dev

ENV APP_ENV=local \
    APP_DEBUG=true

USER root
RUN pecl install xdebug-3.4.2 \
    && docker-php-ext-enable xdebug \
    || true

COPY --chown=app:app apps/api/composer.json apps/api/composer.lock ./
USER app
RUN composer install --no-interaction --no-progress --prefer-dist --no-scripts

USER root
COPY --chown=app:app apps/api/ ./
USER app

CMD ["php-fpm", "-F"]
