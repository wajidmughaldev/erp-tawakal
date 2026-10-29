# Tawakal Enterprises — Employee Management & Smart ID Portal

Next.js frontend (this folder, exported as a static site) + Laravel API (`laravel-backend/`).

Roles: `superadmin` and `manager`. Employees fill in a registration form from a one-time link; an admin reviews and approves it; ID cards are issued, renewed (always as a new card) and verified by QR.

## Run locally

1. API: `cd laravel-backend && composer install`, copy `.env.example` to `.env`, set the database and the `SUPERADMIN_*` values, then `php artisan migrate && php artisan db:seed && php artisan serve --port=8001`.
2. Site: `npm install`, copy `.env.frontend.example` to `.env.local`, then `npm run dev` (http://localhost:3000).

## Tests

- `cd laravel-backend && vendor/bin/phpunit` (needs the MySQL test database from `phpunit.xml`)
- `npm run test:frontend` (unit) and `npm run test:browser` (browser tests with a mocked API)
- `deploy/smoke.mjs` — end-to-end run of the production build against the real API (see `deploy/DEPLOY.md`)

## Deploy

`npm run release` builds `release/ems-web.zip` and `release/ems-laravel.zip`. Step by step instructions for Hostinger (ems.tawakalent.com) are in [deploy/DEPLOY.md](deploy/DEPLOY.md).
