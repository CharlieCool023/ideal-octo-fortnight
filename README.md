# NYSC Camp Evaluation System

A local NYSC camp evaluation app for corps member registration, staff dashboards, evaluations, comments, reports, batches, and staff management.

## Requirements

- Node.js 20+
- MySQL 8+ or a MySQL-compatible database

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env`:

   ```bash
   copy .env.example .env
   ```

3. Start the local MySQL container:

   ```bash
   npm run db:up
   ```

4. Set `SEED_DEFAULT_PASSWORD` in `.env` to a local password with 12–72 characters, then push the schema and seed local accounts:

   ```bash
   npm run db:push
   npm run db:seed
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

To stop the local database container:

```bash
npm run db:down
```

