#!/bin/sh
set -eu

echo "Starting queue worker..."
exec php artisan queue:work redis --sleep=1 --tries=3 --max-time=3600 --timeout=90
