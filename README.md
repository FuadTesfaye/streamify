# Streamify — Private Video Streaming Gateway

A high-security, invitation-only private video streaming gateway using YouTube as the video hosting and delivery infrastructure, with zero-trust application authorization, ephemeral playback leases, copy-paste expiring embed tokens, and dynamic forensic watermarking.

**Application authorization does not protect an extracted unlisted YouTube link.** The authorized browser receives the video ID. Direct YouTube sharing, screen recording, and per-user revocation at YouTube remain outside this application's control. There are no payments or DRM claims.

## Security Architecture

1. **Concealed Provider Infrastructure:** Video IDs are stored encrypted/protected on PostgreSQL/Supabase and never exposed in client bundles, public URLs, sitemaps, or unauthenticated APIs.
2. **Heartbeat-Renewed Leases:** Every playback session is granted a 90-second lease renewed every 30 seconds via cryptographic heartbeat. Abandoned leases expire immediately.
3. **Single-Stream Concurrency Guard:** Concurrent playback lock prevents simultaneous streaming on multiple tabs or devices under the same account.
4. **Ephemeral Embed Tokens:** Generate signed, time-bound embed snippets (`/embed/[token]`). Tokens expire within 3 minutes and invalidate upon copy-paste or session expiration.
5. **Dynamic Forensic Watermark:** Floating overlay with masked viewer identity, session ID, and UTC timestamp shifts coordinates continuously to deter screen recording and leak distribution.


## Run locally

Requires Node.js 22.14+, pnpm 10.33.2, Docker, and Docker Compose v2.

1. Copy `.env.example` to `.env` if `.env` does not already exist. Generate a secret with `openssl rand -hex 32` and replace `BETTER_AUTH_SECRET`. Choose two different URL-safe database passwords and update both database URLs to match. Keep `.env` private.
2. Run `docker compose up --build -d`. The database initializer creates a restricted application role; the migration container creates the authentication and application schemas. Open **http://localhost:3000** and local email at **http://localhost:8025**.
3. Create your administrator without putting its password in shell history:

   ```bash
   read -r -p 'Admin email: ' ADMIN_EMAIL
   read -r -s -p 'Admin password (12+ characters): ' ADMIN_PASSWORD
   echo
   export ADMIN_EMAIL ADMIN_PASSWORD
   docker compose run --rm --no-deps \
     -e ADMIN_EMAIL -e ADMIN_PASSWORD migrate \
     node --import tsx scripts/create-admin.ts
   unset ADMIN_EMAIL ADMIN_PASSWORD
   ```

4. Sign in, configure an authenticator app, save its recovery codes, and verify your browser using the code in Mailpit. Open **Administration**.
5. Create a course and lesson, supply your own unlisted YouTube video, publish both, and invite a student. The invitation optionally grants the initial course enrollment. Existing accounts use the enrollment form instead.

There are no default accounts or seeded passwords. A bootstrap administrator is email-verified by the operator; students must verify their email. Invitations expire in seven days. Use the exact configured origin (`localhost` and `127.0.0.1` are different origins).

For host-based development with live editing:

```bash
pnpm install --frozen-lockfile
docker compose up -d db redis mailpit
pnpm db:migrate
pnpm dev
```

Host commands load `.env` for migration, seeding, administrator creation, and event pruning. `pnpm db:seed` adds only a **draft** example course with a nonworking placeholder video; replace it before publishing. The application container uses the restricted `streamify_app` database role, while migrations use `MIGRATION_DATABASE_URL`.

## How access works

- Better Auth handles password hashing, verified email, password resets, secure session cookies, and authenticator MFA. Each successful MFA verification is recorded against the specific login session, so a pre-existing login cannot gain access simply because MFA was enabled elsewhere. Public self-registration and unused authentication endpoints are disabled. Invitation acceptance atomically creates the user, credential, enrollment, and consumed invitation.
- Every protected page and endpoint performs server authorization. Account status and session state are read from PostgreSQL; session-cookie caching is disabled. Login sessions have a 30-minute idle limit and an eight-hour absolute limit.
- New browser registration requires an emailed, ten-minute OTP with five attempts. Credentials are HttpOnly cookies; only hashes are stored. Registrations last 30 days and are limited to two per account. This is browser credential registration, not physical device identification or fingerprinting.
- Playback launch holds a PostgreSQL account-row lock while checking session ownership, trusted browser, account status, enrollment, publication, and the active playback limit. Simultaneous launch attempts cannot both claim the single playback slot.
- The client renews its 90-second playback lease every 30 seconds. Renewal repeats authorization. Denial, an expired lease, or an unavailable security service removes the iframe. Explicit exit releases the lease where possible; abandoned leases expire. A browser can manipulate its own JavaScript; these controls do not revoke the extracted YouTube link.
- Student lesson queries explicitly omit video IDs. Only an authorized launch returns provider information. Administrators can see video IDs to manage lessons. Sensitive pages and API responses use `private, no-store`; there is no service worker or shared content cache.
- Redis provides atomic rate limiting. Required database and limiter failures deny access. Origin/fetch-site validation protects mutations. A nonce-based script CSP, secure production cookies, HTTPS, validation, and audit events provide additional controls.
- Security events record grants, denials, login steps, browser challenges, rate limits, and administrative changes. The activity screen flags repeated denials, rate limits, and browser challenges within the latest 100 events. These are investigation signals, not proof of sharing. No raw passwords, OTPs, session credentials, or video IDs are recorded. There is no third-party analytics or authentication telemetry.

### Main interfaces

| Interface                                               | Purpose                                                                          |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `POST /api/invitations/accept`                          | Redeem an email-bound, single-use invitation                                     |
| `POST /api/browsers/challenge`                          | Send browser verification OTP                                                    |
| `POST /api/browsers/verify`                             | Verify OTP and issue the browser cookie                                          |
| `POST /api/lessons/:id/playback`                        | Return `{ playbackSessionId, provider, videoId, expiresAt }` after authorization |
| `POST /api/playback/:id/heartbeat`                      | Renew a lease owned by the current login and browser                             |
| `POST /api/playback/:id/release`                        | Release that playback                                                            |
| `GET /api/account`                                      | List this account's browsers, login sessions, and playbacks without credentials  |
| `DELETE /api/account/{browsers,sessions,playbacks}/:id` | Revoke an owned resource                                                         |
| `POST /api/admin/...`                                   | MFA- and browser-protected content and access management                         |
| `GET /api/health`                                       | Database/Redis readiness without infrastructure details                          |

Errors use `{ error: { code, message } }`. Authentication endpoints use Better Auth's native response shape. Authorization returns 401/403; a browser or playback capacity conflict returns 409; rate limits return 429; required infrastructure failures return 503. Playback uses a server-only provider interface; YouTube is the only provider currently configured.

### Implementation choices

Next.js App Router, TypeScript, Better Auth, PostgreSQL, Redis, React, and CSS. PostgreSQL uses the native `pg` driver and versioned SQL migrations rather than Prisma. This removes a generated-client dependency and keeps transaction locking explicit. Authentication schema migrations come from the pinned Better Auth version. SMTP supports implicit TLS (normally port 465) with optional LOGIN authentication; plaintext is for local Mailpit. Providers that require STARTTLS on port 587 need a compatible implicit-TLS endpoint or a transport extension.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Unit tests run without listening sockets and exercise origin checks, body-size bounds, safe error envelopes, session deadlines, ID validation, credentials, and the actual Redis/SMTP encoders and parsers using scripted peer sockets. Browser smoke tests cover public pages, responsive layout, copied application links, anonymous playback, CSRF, disabled registration, and CSP.

### Service-backed tests

Use a **separate disposable database whose name contains `streamify_test`**, never your development or production database. Start PostgreSQL, Redis, and Mailpit first. For the supplied local stack:

```bash
docker compose exec db createdb -U streamify_owner streamify_test
```

Set `DATABASE_URL` and `MIGRATION_DATABASE_URL` in a private `.env.test` to that test database using owner credentials. Use loopback host addresses, `APP_ORIGIN=http://127.0.0.1:3000`, and development SMTP settings. Then:

```bash
node --env-file=.env.test --import tsx scripts/migrate.ts
RUN_INTEGRATION=1 node --env-file=.env.test --import tsx \
  --test --experimental-test-isolation=none tests/integration/*.test.ts
FULL_E2E=1 node --env-file=.env.test node_modules/@playwright/test/cli.js test
```

Integration tests verify racing playback launches, ownership, expiry, enrollment revocation, draft content, suspension, and browser/login revocation. The full browser test redeems an invitation, follows the actual verification email, verifies a browser through Mailpit, loads a mocked official player, enforces concurrency, and removes playback after enrollment revocation. It never fetches a real YouTube video. Disabled integration suites report skipped; they are not a substitute for a real-service run.

Manual smoke test before launch: use an institution-owned unlisted video; verify controls, fullscreen, captions, mobile sizing, origin/referrer behavior, unavailable-video errors, and administrator revocation during playback. Confirm that browser inspection reveals the video ID and that the extracted link still works on YouTube. Test suspension, expired login, and a third browser registration as well.

## Production deployment

Use **`compose.production.yaml` alone**, not as an override of the development file:

1. Point the institution's domain at the server. Configure `APP_HOST`, an HTTPS `APP_ORIGIN`, strong distinct secrets/passwords, and a real sender and implicit-TLS SMTP service in `.env`. URL-encode database passwords in URLs, or use random hexadecimal passwords.
2. Fill in the institution's identity and privacy contact on the privacy page. Configure sender-domain SPF/DKIM and verify delivery of invitations, browser OTPs, verification, and recovery emails.
3. Back up the database, then run `docker compose -f compose.production.yaml up --build -d`. Caddy supplies HTTPS. Only Caddy publishes production ports. `X-Real-IP` is overwritten by Caddy; the app trusts it only in this isolated topology. Do not expose the application port separately or blindly trust client-supplied proxy headers.
4. Bootstrap the administrator using the same `docker compose run` command with `-f compose.production.yaml`. Complete MFA and browser verification.
5. Run the service-backed tests against staging and complete the real-player smoke test. Deployments are not executed by this repository setup.

The database role initializer runs **only on first creation of the database volume**. Updating `.env` passwords later does not rotate database roles automatically. The long-running application receives only its restricted runtime URL; migration credentials are supplied to the tooling service separately.

The production app runs as a non-root user. Database and Redis ports are internal. Use `docker compose -f compose.production.yaml logs app` and health status to investigate outages. Alert on failing `/api/health`, repeated authorization/login failures, rate-limit events, and unexpected browser registrations. Do not enable proxy logs that retain invitation/password-reset tokens or sensitive request bodies.

Schedule security-event pruning daily through the migration/tooling image:

```bash
docker compose -f compose.production.yaml run --rm --no-deps migrate \
  node --import tsx scripts/prune.ts
```

Keep encrypted, access-controlled daily PostgreSQL backups off-server, with a retention policy chosen by the institution. A logical backup command is `docker compose -f compose.production.yaml exec -T db pg_dump -U streamify_owner -Fc streamify > streamify.dump`. Regularly restore a backup into an isolated database using `pg_restore`, verify accounts/enrollment/content, and test login and playback authorization. Preserve `BETTER_AUTH_SECRET` securely: losing it affects encrypted MFA material and authentication credentials. Redis is not the source of truth for playback or login sessions; its production volume preserves limiter state across normal restarts.

Migrations take a PostgreSQL advisory lock and record applied SQL files. They are additive for this initial release. Review future authentication schema changes in staging before upgrading dependencies; there is no automatic rollback of database schema changes. Roll back the app image only when it remains compatible with the applied schema.

For a leaked unlisted video ID, change privacy or replace the video in YouTube, update the lesson, and revoke affected application access. Streamify cannot identify every direct-link share or automatically revoke YouTube access per student.

Official references: [YouTube privacy settings](https://support.google.com/youtube/answer/157177), [IFrame API](https://developers.google.com/youtube/iframe_api_reference), [developer policies](https://developers.google.com/youtube/terms/developer-policies), [Better Auth database integration](https://better-auth.com/docs/concepts/database), and [Mailpit testing](https://mailpit.axllent.org/docs/integration/).
