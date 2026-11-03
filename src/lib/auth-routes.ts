const posts = new Set([
  "sign-in/email",
  "sign-out",
  "send-verification-email",
  "request-password-reset",
  "reset-password",
  "change-password",
  "two-factor/enable",
  "two-factor/disable",
  "two-factor/verify-totp",
  "two-factor/verify-backup-code",
  "two-factor/get-totp-uri",
  "two-factor/generate-backup-codes",
]);
export function allowedAuthRoute(method: string, path: string) {
  if (method === "POST") return posts.has(path);
  return (
    method === "GET" &&
    (path === "verify-email" ||
      /^reset-password\/[a-zA-Z0-9_-]{16,128}$/.test(path))
  );
}
