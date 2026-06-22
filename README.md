# FootballPredictor API

A production-ready Node.js + Express REST API backend for a football prediction application.

## Features

- MongoDB with Mongoose
- JWT authentication
- OpenAI integration for prediction generation
- Stripe payment endpoints behind a feature flag
- API-Football syncing via RapidAPI
- Winston logging with daily rotate
- Scheduled jobs with node-cron
- Joi request validation
- Role-based route access control

## Installation

1. Install dependencies:
   ```bash
   yarn install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Fill in values in `.env`.
4. Create the initial superadmin:
   ```bash
   yarn seed
   ```
5. Start the server:
   ```bash
   yarn start
   ```

## Environment Variables

Required:

- `PORT=5000`
- `MONGO_URI=` MongoDB connection string
- `JWT_SECRET=` secret for JWT signing
- `JWT_EXPIRES_IN=7d`
- `OPENAI_API_KEY=` OpenAI API key
- `OPENAI_MODEL=gpt-4.1`
- `API_FOOTBALL_KEY=` RapidAPI key for API-Football
- `API_FOOTBALL_HOST=v3.football.api-sports.io`
- `STRIPE_SECRET_KEY=` Stripe secret key
- `STRIPE_WEBHOOK_SECRET=` Stripe webhook secret
- `STRIPE_ENABLED=false`
- `PREDICTION_MODE=shared`
- `APP_NAME=FootballPredictor`
- `NODE_ENV=development`
- `SEED_SUPERADMIN_EMAIL=` initial superadmin email
- `SEED_SUPERADMIN_PASSWORD=` initial superadmin password

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Fixtures

- `GET /api/fixtures`
- `GET /api/fixtures/live`
- `GET /api/fixtures/upcoming`
- `GET /api/fixtures/:id`
- `POST /api/fixtures/sync` [admin, superadmin]

### Predictions

- `POST /api/predictions/generate` [admin, superadmin]
- `GET /api/predictions/fixture/:id`
- `GET /api/predictions/:id`
- `GET /api/predictions` [admin, superadmin]
- `GET /api/predictions/accuracy` [admin, superadmin]

### Tickets

- `POST /api/tickets`
- `GET /api/tickets`
- `GET /api/tickets/:id`
- `DELETE /api/tickets/:id`
- `GET /api/tickets/all` [admin, superadmin]
- `POST /api/tickets/smart-build`

### Admin

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/tickets`
- `GET /api/admin/predictions`
- `POST /api/admin/fixtures/sync`

### Superadmin

- `GET /api/superadmin/admins`
- `POST /api/superadmin/admins`
- `DELETE /api/superadmin/admins/:id`
- `GET /api/superadmin/usage`
- `GET /api/superadmin/system`
- `PATCH /api/superadmin/system`
- `POST /api/superadmin/predictions/regenerate/:id`

### Stripe

- `GET /api/stripe/plans`
- `POST /api/stripe/subscribe`
- `DELETE /api/stripe/subscribe`
- `GET /api/stripe/portal`
- `POST /api/stripe/credits`

### Webhook

- `POST /api/webhook/stripe`

## Notes

- All responses use a standard format: `success`, `data`, `message`, and `error` when applicable.
- Rate limiting is applied to auth routes (10 requests per 15 minutes).
- Stripe endpoints are gated by `STRIPE_ENABLED=true`.
