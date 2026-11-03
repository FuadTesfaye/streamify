import { getAuth } from "@/lib/auth";
import { endpoint, jsonBody } from "@/lib/http";
import { rateLimit, requestIp } from "@/lib/security";
import { assert } from "@/lib/errors";
import { requireViewer } from "@/lib/authorization";
import { audit } from "@/lib/security";
import { allowedAuthRoute } from "@/lib/auth-routes";
const handler = (mutation: boolean) =>
  endpoint(async (request) => {
    const path = new URL(request.url).pathname.replace("/api/auth/", "");
    assert(allowedAuthRoute(request.method, path), 404, "NOT_FOUND");
    await rateLimit("auth-ip", requestIp(request), 40);
    if (mutation) {
      const body = await jsonBody(request.clone());
      if (
        body &&
        typeof body === "object" &&
        "email" in body &&
        typeof body.email === "string"
      )
        await rateLimit("auth-email", body.email.toLowerCase(), 8, 300);
    }
    if (
      [
        "change-password",
        "two-factor/enable",
        "two-factor/disable",
        "two-factor/get-totp-uri",
        "two-factor/generate-backup-codes",
      ].includes(path)
    )
      await requireViewer({ allowMfaSetup: true });
    if (
      ["two-factor/verify-totp", "two-factor/verify-backup-code"].includes(path)
    ) {
      const existing = await getAuth().api.getSession({
        headers: request.headers,
      });
      if (existing) await requireViewer({ allowMfaSetup: true });
    }
    const response = await getAuth().handler(request);
    if (mutation && path === "sign-in/email")
      await audit(response.ok ? "login_step_completed" : "login_denied");
    // Browser clients authenticate with HttpOnly cookies; do not duplicate session tokens in JSON.
    if (response.headers.get("content-type")?.includes("application/json")) {
      const body = await response.clone().json();
      if (body && typeof body === "object" && "token" in body) {
        delete body.token;
        const headers = new Headers(response.headers);
        headers.delete("content-length");
        return new Response(JSON.stringify(body), {
          status: response.status,
          headers,
        });
      }
    }
    return response;
  }, mutation);
export const GET = handler(false);
export const POST = handler(true);
