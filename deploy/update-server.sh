#!/usr/bin/env bash
# Updates the live site from GitHub. Run it on the server over SSH:
#
#   bash ~/domains/tawakalent.com/ems-repo/deploy/update-server.sh
#
# - Laravel code comes from the "main" branch (cloned in ems-repo)
# - the website comes from the "web-build" branch (built by GitHub Actions) and is copied into public_html/ems
# .env, stored files (storage/) and vendor/ are not in git, so an update never touches them.
set -euo pipefail

ROOT="${EMS_ROOT:-$HOME/domains/tawakalent.com}"
REPO="$ROOT/ems-repo"
WEB_CLONE="$ROOT/ems-web-build"
WEB_ROOT="$ROOT/public_html/ems"

echo "== Laravel (main)"
cd "$REPO"
git fetch origin main
git reset --hard origin/main
cd laravel-backend
php -r 'exit(version_compare(PHP_VERSION, "8.3.0", ">=") ? 0 : 1);' || { echo "PHP CLI is $(php -v | head -1); 8.3 or newer is required."; exit 1; }
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan config:clear
php artisan route:clear
php artisan view:clear

echo "== Website (web-build)"
if [ -d "$WEB_CLONE/.git" ]; then
  git -C "$WEB_CLONE" fetch origin web-build
  git -C "$WEB_CLONE" reset --hard origin/web-build
else
  git clone --branch web-build --single-branch "$(git -C "$REPO" remote get-url origin)" "$WEB_CLONE"
fi
mkdir -p "$WEB_ROOT"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude '.git' "$WEB_CLONE/" "$WEB_ROOT/"
else
  find "$WEB_ROOT" -mindepth 1 -delete
  cp -a "$WEB_CLONE/." "$WEB_ROOT/"
  rm -rf "$WEB_ROOT/.git"
fi

echo "== Done. Check https://ems.tawakalent.com/up"
