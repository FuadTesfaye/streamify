import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
export const token = () => randomBytes(32).toString("base64url");
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function otpHash(value: string, challenge: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`${challenge}:${value}`)
    .digest("hex");
}
export function matches(a: string, b: string) {
  return (
    a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
export const deviceCookie =
  process.env.NODE_ENV === "production"
    ? "__Host-streamify-browser"
    : "streamify-browser";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 30 * 86400,
};
