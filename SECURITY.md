# Security deployment requirements

The codebase adds application-level defenses, but these do not make the service invulnerable or replace controls at the hosting and database layers.

## Required production configuration

- Set `JWT_SECRET` in Vercel to a randomly generated secret with at least 32 characters. Do not use the development fallback. Rotating it invalidates all active login sessions.
- Keep `DATABASE_URL` private and use a database user with only the permissions this application needs. Do not expose the MySQL port publicly.
- Do not run `npm run db:seed` in production. The script now refuses production execution and requires a local seed password of at least 12 characters.
- Review existing production staff accounts and reset or remove any accounts created earlier with the old shared `admin123` seed password. The code change does not alter accounts already in the live database.

## Rate limiting and DDoS

The application applies an in-process limit of 120 API requests per IP per minute, plus login limits of 5 attempts per IP/account and 30 attempts per IP per 15 minutes. These counters are defense in depth; they are local to each server process and are not a distributed DDoS control.

Configure a Vercel Firewall rate-limit rule for `/api/trpc/customAuth.login` before deploying. Start in monitoring mode, then publish a limit appropriate for staff usage. Vercel's platform firewall provides the upstream layer for volumetric attacks; application code cannot absorb or stop network floods before they reach the host.

## Upload handling

The registration form accepts `.jpg`, `.jpeg`, `.png`, and `.webp` files only when the filename extension and browser-reported MIME type agree. It decodes the file before re-encoding it to JPEG. The API separately decodes and normalizes the JPEG with Sharp, limits the input to one megapixel and 20 KB, and stores only the normalized result.
