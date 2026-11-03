import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "./errors";
import { audit, sameOrigin } from "./security";
export function endpoint(
  handler: (request: Request) => Promise<Response>,
  mutation = true,
) {
  return async (request: Request) => {
    try {
      if (mutation) sameOrigin(request);
      const response = await handler(request);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      let status = 503,
        code = "SERVICE_UNAVAILABLE",
        message = "The service is temporarily unavailable. Please try again.";
      if (error instanceof AppError) {
        ({ status, code, message } = error);
      } else if (error instanceof z.ZodError || error instanceof SyntaxError) {
        status = 400;
        code = "INVALID_REQUEST";
        message = "Please check the submitted fields.";
      } else if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        status = 409;
        code = "CONFLICT";
        message =
          "This record already exists or the lesson position is in use.";
      }
      // Deliberately never print raw exceptions: drivers may include submitted values.
      if (status === 503)
        console.error("streamify_request_failed", {
          method: request.method,
          code,
        });
      if (status === 401 || status === 403)
        await audit("access_denied", undefined, code).catch(() => {});
      return NextResponse.json(
        { error: { code, message } },
        {
          status,
          headers: {
            "Cache-Control": "private, no-store",
            ...(status === 429 ? { "Retry-After": "60" } : {}),
          },
        },
      );
    }
  };
}
export async function jsonBody(request: Request) {
  // Bound streamed bodies as well as declared Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "MISSING_BODY");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > 32_768) {
      await reader.cancel();
      throw new AppError(413, "BODY_TOO_LARGE");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
