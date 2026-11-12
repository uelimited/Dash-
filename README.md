# Dash

## Structure

- `frontend/app`: Next.js pages and the thin `/api/workspace` HTTP route.
- `frontend/components/pages`: one component per page; Overview is home.
- `frontend/components`: cards, charts, register tables and editors.
- `frontend/lib`: shared types, validation, calculations and API client.
- `backend/mysql`: MySQL storage, transaction handling, setup and checks.
- Other files in `backend`: retained inactive Python/SQLite implementation.
- `archive`: recovery copies of earlier app files.

## Run locally

Start the Windows MySQL80 service, then run `npm run dev` from Dash.
Open http://localhost:3000. Both development and production scripts bind to
127.0.0.1: this deployment is local-only. Visitors are read-only; the approved administrator signs in with email OTP.
Build with `npm run build`; run the built app with `npm start`.

For a fresh installation, run `npm install --prefix frontend` and
`npm install --prefix backend`, then `npm run db:setup`. Enter the MySQL root
password at the private prompt. The setup creates the `dash` database,
three prefixed tables and the local `dash_app` account. It grants only SELECT,
INSERT, UPDATE and DELETE on `dash`; it does not save the root password.
The generated app password lives in ignored `backend/mysql/.env`.
Do not commit or share that file. Existing unrelated MySQL tables are untouched.

## Storage and migration

The app now reads and saves through MySQL using the `mysql2` driver. No Prisma
runtime is used. The database is configured on the server, never in browser code.

- `dash_projects`: project identity, display order and JSON metadata.
- `dash_records`: material, design, history and other register rows. JSON retains
  every existing field, including revision history, source markers and notes.
  TDS and procurement share rows with `register_name = 'items'`.
- `dash_workspace`: initialization state and the shared change version.

The first visit prompts to move the current browser's saved workspace into the
empty database. Use the same browser and http://localhost:3000 address used for
editing. The old localStorage copy is preserved, and the import screen can
download it. If no browser copy exists, the included project registers can be
used explicitly. Initialization cannot overwrite an already initialized database.
After import, localStorage is never used as the active store. Deleting projects
or records does not cause them to be reseeded on reload.

All writes use a database transaction. Field checks prevent stale row edits;
workspace versions prevent stale whole-project saves/deletes. Saves update the
current view immediately. Other visible tabs check MySQL every 5 seconds and on
focus; this is polling, not a WebSocket push connection. Connection errors are
shown without falling back to browser-only saves.

## Check the connection

Run `npm run db:check`. It verifies the connection and a rolled-back write, then
prints counts without credentials. After importing records and starting the
app, `node backend/mysql/integration-check.mjs` tests API saving, conflicts and
deletion with a temporary project, then removes only its own test project.

In Workbench, refresh Schemas, expand `dash` and inspect its tables. For example:

```sql
SELECT name, code FROM dash.dash_projects;
SELECT project_id, register_name, COUNT(*) AS records
FROM dash.dash_records GROUP BY project_id, register_name;
```

Use MySQL backup tools for ongoing backups. The retained browser copy is the
pre-migration snapshot, not a backup of subsequent database edits.

Admin authentication is implemented. Microsoft 365 sender authorization must be completed before real OTP login. See backend/auth/SETUP.md. Keep the default loopback-only server binding until network hosting is configured.


## Current access

Admin authentication was removed at the user’s request. All visitors to this local app can add, edit and delete records. MySQL remains the active storage. Login redirects to home and auth endpoints are disabled. Retained backend/auth files and dash_auth_* tables are inactive; previous authentication setup instructions no longer apply. The server remains bound to this computer.
