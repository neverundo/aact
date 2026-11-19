# syntax=docker/dockerfile:1.7

FROM php:8.4.27-fpm-bookworm AS base

# Keep apt lists/packages for BuildKit cache mounts across rebuilds.
RUN rm -f /etc/apt/apt.conf.d/docker-clean \
    && echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update \
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
    && docker-php-ext-enable redis

COPY --from=composer:2.8.8 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

RUN useradd --create-home --uid 1000 --shell /bin/bash app \
    && chown -R app:app /var/www/html

# Override pool user/group (see zz-app-user.conf). TCP :9000 needs no socket owner.
COPY infra/docker/api/zz-app-user.conf /usr/local/etc/php-fpm.d/zz-app-user.conf

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
    CMD php -r 'exit(@fsockopen("127.0.0.1",9000)?0:1);'

CMD ["php-fpm", "-F"]

FROM base AS app-dev

ENV APP_ENV=local \
    APP_DEBUG=true

# Local Compose bind-mounts ./apps/api and runs `composer install` in make setup.
# Do not bake vendor/app into this image — it only wastes build time and disk.
USER root
RUN --mount=type=cache,target=/tmp/pear \
    pecl install xdebug-3.4.2 \
    && docker-php-ext-enable xdebug \
    || true

USER app
CMD ["php-fpm", "-F"]
