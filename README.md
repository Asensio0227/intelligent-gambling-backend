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

# AWS

docker stop ig-backend
docker rm ig-backend
docker build -t ig-backend .
docker run -d --name ig-backend -p 3000:3000 --env-file .env --restart unless-stopped ig-backend
docker logs -f ig-backend

# AWS backfill

docker exec -it ig-backend node -r ts-node/register/transpile-only src/scripts/backfillFinishedFixtures.ts

# AWS EC2 instance deploy

cd ~/Documents/servers/intelligent\ gambler
zip -r bcknd.zip . -x "node*modules/*" -x ".git/\_"

ssh -i ~/Pictures/aws-amazon/intelligent-gambler/intelligent-gambler.pem ubuntu@54.196.145.72

cd ~
rm -rf intelligent-gambler-backend
unzip bcknd.zip -d intelligent-gambler-backend
cd intelligent-gambler-backend

nano .env

docker stop ig-backend
docker rm ig-backend
docker build -t ig-backend .
docker run -d --name ig-backend -p 3000:3000 --env-file .env --restart unless-stopped ig-backend
docker logs -f ig-backend

curl http://localhost:3000/api/health

# UPDATE AWS DEPLOYMENT

Good — the changes are already in. Now let's get this deployed to EC2. Open your AWS Session Manager terminal and run:

# bash

sudo su - ubuntu
cd intelligent-gambler-backend
Then on your local machine, upload the new zip:

# bash

scp -i ~/Pictures/aws-amazon/intelligent-gambler/intelligent-gambler.pem "/home/mthee-junior/Documents/servers/intelligent gambler/bckend.zip" ubuntu@54.196.145.72:~
Then back on the EC2 Session Manager terminal:

# bash Replace the old source with the new zip

cd ~
rm -rf intelligent-gambler-backend
unzip bckend.zip -d intelligent-gambler-backend
cd intelligent-gambler-backend

# Restore .env

nano .env
Paste your env vars back in, save (Ctrl+O, Enter, Ctrl+X), then rebuild and restart:

# bash

docker stop ig-backend
docker rm ig-backend
docker build -t ig-backend .
docker run -d --name ig-backend -p 3000:3000 --env-file .env --restart unless-stopped ig-backend
docker logs -f ig-backend

Let me know once the upload is done or if SCP times out (IP may have shifted again — just run curl -4 ifconfig.me and update the security group rule like before).
