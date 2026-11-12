# Private Dash deployment — prepared, not yet deployed

Use the root Dockerfile on a Node.js hosting service such as Railway. Create a private-network MySQL service and a Dash application service. The app listens on the hosting service PORT. Do not expose MySQL publicly.

Set runtime variables on Dash, not in source:

- MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE: references to the hosted MySQL service.
- AUTH_ORIGIN: the exact HTTPS URL assigned to Dash, without a trailing slash.
- AUTH_SECRET: a fresh random secret of at least 32 characters, different from local development.
- ADMIN_EMAIL: nanurao051@gmail.com
- VIEWER_EMAILS: pksw.innovationlabs@gmail.com
- REQUIRE_LOGIN: true (production always requires login).
- EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY: configure privately using the existing EmailJS service.

In the EmailJS template, set To Email to {{to_email}} and remove any CC/BCC recipient: a copied OTP permits that recipient to sign in as the intended user. The sender remains the marketing mailbox. The body uses {{passcode}}, {{expiry_minutes}} and {{time}}.

Before publishing: transfer the workspace schema and records privately to the hosted database; initialize Better Auth tables; run node backend/auth/sync-invited.mjs from the app root; do not copy old sessions or OTPs. Verify anonymous reads return 401, invited viewers can read but cannot write, the admin can edit, and logout revokes access. Compare project/record counts before switching to hosted data. Enable database backups.

The local files are not automatically synchronized to the hosted database. After migration, nominate the hosted database as the shared source of records.

ChatGPT: create a new Dash project, add TEAM-HANDOFF.md, then Share > Only invited > pksw.innovationlabs@gmail.com. Share its project link. Do not move the original credential-containing setup conversation into the shared project.
