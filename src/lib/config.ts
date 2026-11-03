import { z } from "zod";
const schema = z.object({
  APP_ORIGIN: z.url().transform((v) => new URL(v).origin),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32)
    .refine((v) => !v.startsWith("replace-"), "Replace the example secret"),
  DATABASE_URL: z.string().startsWith("postgres"),
  REDIS_URL: z.url(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z
    .string()
    .min(3)
    .refine((v) => !/[\r\n]/.test(v)),
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});
export function config() {
  const result = schema.parse(process.env);
  if (
    process.env.NODE_ENV === "production" &&
    (!result.APP_ORIGIN.startsWith("https://") || !result.SMTP_SECURE)
  ) {
    throw new Error(
      "Production requires HTTPS and implicit TLS SMTP (usually port 465)",
    );
  }
  return result;
}
