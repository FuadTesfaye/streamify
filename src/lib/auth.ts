import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";
import { db, rows } from "./db";
import { config } from "./config";
import { sendMail } from "./mail";
let instance: ReturnType<typeof createAuth> | undefined;
function createAuth() {
  const cfg = config();
  return betterAuth({
    logger: { disabled: true },
    telemetry: { enabled: false },
    appName: "Streamify",
    baseURL: cfg.APP_ORIGIN,
    secret: cfg.BETTER_AUTH_SECRET,
    database: db,
    trustedOrigins: [cfg.APP_ORIGIN],
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) =>
        sendMail(
          user.email,
          "Reset your Streamify password",
          `Reset your password using this link:\n${url}\nIf you did not request this, ignore this message.`,
        ),
    },
    emailVerification: {
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url }) =>
        sendMail(
          user.email,
          "Verify your Streamify email",
          `Welcome to Streamify. Verify your email:\n${url}`,
        ),
    },
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "student", input: false },
        status: { type: "string", defaultValue: "active", input: false },
      },
    },
    session: {
      expiresIn: 8 * 3600,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
      freshAge: 1800,
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    rateLimit: { enabled: true, window: 60, max: 30 },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        if (
          ![
            "/two-factor/verify-totp",
            "/two-factor/verify-backup-code",
          ].includes(ctx.path)
        )
          return;
        const result = ctx.context.returned;
        if (
          !result ||
          typeof result !== "object" ||
          !("token" in result) ||
          typeof result.token !== "string"
        )
          return;
        const verified = ctx.context.newSession ?? ctx.context.session;
        if (verified)
          await db.query(
            "INSERT INTO session_mfa(session_id) VALUES($1) ON CONFLICT(session_id) DO UPDATE SET verified_at=now()",
            [verified.session.id],
          );
      }),
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/two-factor/disable") {
          const current = await getAuth().api.getSession({
            headers: ctx.headers ?? new Headers(),
          });
          if (current?.user.role === "admin")
            throw new APIError("FORBIDDEN", {
              message: "Administrators must keep MFA enabled.",
            });
        }
      }),
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const [user] = await rows<{ status: string }>(
              'SELECT status FROM "user" WHERE id=$1',
              [session.userId],
            );
            if (user?.status !== "active")
              throw new APIError("FORBIDDEN", {
                message: "Account unavailable.",
              });
            return { data: session };
          },
        },
      },
    },
    plugins: [
      twoFactor({ issuer: "Streamify", skipVerificationOnEnable: false }),
    ],
  });
}
export function getAuth() {
  return (instance ??= createAuth());
}
