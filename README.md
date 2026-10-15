# PawPort

PawPort is a Vue 3 pet marketplace backed by a Node.js API and SQLite database. User accounts, sessions, listings, and inquiries are stored server-side.

## Requirements

- Node.js 22.13 or newer
- npm

## Development

1. Install packages with `npm install`.
2. Run `npm run dev`.
3. Open the local URL printed by Vite.

Development starts the API and frontend together. If the configured API port is already in use, PawPort automatically chooses another available port and updates the frontend proxy; Vite likewise chooses another port if its default is occupied. On its first run without a `.env` file, it creates a local administrator account and prints its randomly generated credentials in the terminal. Save them; they are also stored in the ignored `.env` file. If you already have a `.env`, set both `ADMIN_EMAIL` and `ADMIN_PASSWORD` there. Sign up as an adopter or provider from the app. Admin sign-in is available at `/admin`. The SQLite file is created at `server/data/pawport.sqlite`.

## Production

Run `npm run build`, set `NODE_ENV=production`, then `npm start` (in PowerShell: `$env:NODE_ENV="production"`). The Node server serves both the built frontend and the API from the same origin. Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PUBLIC_ORIGIN` (the exact public origin, such as `https://pawport.example`), and optionally `PORT` in the server environment. Put the server behind HTTPS in production so secure session cookies can be used. Keep `.env` and the SQLite database out of source control.

## Data and inquiries

Marketplace, provider, and admin listing actions use the same SQLite-backed API. Inquiries are validated and saved to SQLite; this project does not send email notifications. The interface confirms that an inquiry was saved rather than claiming the provider was notified.

## Tests

Run `npm test` for API integration tests. Run `npm run build` to validate the frontend production bundle.
