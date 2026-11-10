#!/bin/sh
set -eu

echo "Starting scheduler loop..."
while true; do
  php artisan schedule:run --verbose --no-interaction
  sleep 60
done
