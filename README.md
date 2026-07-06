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

4. Push the schema and seed local accounts:

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

## Default Local Credentials

All seeded users use password `admin123`.

| Role | Username | Login |
| --- | --- | --- |
| Super Admin | `superadmin` | `http://localhost:3000/super-admin/login` |
| State Commandant | `statecommandant` | `http://localhost:3000/login` |
| Camp Commandant | `campcommandant` | `http://localhost:3000/login` |
| Platoon Instructor | `platoon` | `http://localhost:3000/login` |
| Man O'War Instructor | `manowar` | `http://localhost:3000/login` |
| Soldier | `soldier` | `http://localhost:3000/login` |

After login, the app routes each account to the dashboard for its database role. The staff login accepts all non-superadmin roles; the superadmin account must use the separate superadmin endpoint.
