# Dash admin login with EmailJS

Visitors can view projects. Only nanurao051@gmail.com can add, edit or delete through Dash after OTP login. There is no public registration.

1. In EmailJS keep marketing@uelimited.com connected as the sending email service. The sender and admin recipient are separate.
2. Create a template with **To Email** set to `{{to_email}}` (or fixed to nanurao051@gmail.com), subject `Your Dash sign-in code`, and body:

   Your {{app_name}} sign-in code is {{otp_code}}. It expires in {{expiry_minutes}} minutes. If you did not request this code, ignore this email.

3. Allow server/non-browser API requests in the EmailJS account security settings, if your account requires it. If private-key authorization is enabled, provide that key in local setup. No keys or OTPs belong in frontend code.
4. Run `powershell -NoProfile -File backend/setup-emailjs.ps1` from the Dash folder. Enter the Service ID, Template ID and Public Key. Enter the Private Key only in the masked local prompt, if used.
5. Open http://localhost:3001/login and request a code for nanurao051@gmail.com. The actual receiving mailbox must be accessible to you. EmailJS account quotas and service authorization must be valid.

Settings stay in ignored `backend/auth/.env`. This is separate from the MySQL account credentials. AUTH_ORIGIN must match the app address; localhost and 127.0.0.1 on the configured port are supported. For a future shared deployment use HTTPS and set the trusted origin explicitly.

The server generates and verifies codes using Better Auth, with hashed OTP storage in MySQL, five-minute expiry, three wrong attempts per code, a 60-second resend delay, and blocked public signup. Remember me lasts up to 30 days; otherwise the browser cookie lasts for the browser session and the server session expires within eight hours. Logout revokes the session. EmailJS is only the delivery service.

Official API reference: https://www.emailjs.com/docs/rest-api/send/

## EmailJS OTP preset compatibility

Dash supplies `passcode`, `time` (expiry time in India), and `email` for the EmailJS OTP preset. It also supplies `otp_code`, `expiry_minutes` (5), and `to_email`. Replace any fixed “15 minutes” wording in the template with `{{expiry_minutes}} minutes` so the message agrees with the five-minute server expiry.
