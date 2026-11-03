export const LEASE_MS = 90_000;
export const HEARTBEAT_MS = 30_000;
export const IDLE_MS = 30 * 60_000;
export const LOGIN_MS = 8 * 60 * 60_000;
export const MAX_BROWSERS = 2;
export function sessionAlive(created: Date, touched: Date, now = Date.now()) {
  return (
    now - created.getTime() < LOGIN_MS && now - touched.getTime() < IDLE_MS
  );
}
export function maskedEmail(email: string) {
  const [name, host] = email.split("@");
  return `${name.slice(0, 1)}•••@${host}`;
}
export function normalizeVideo(input: string) {
  const idPattern = /^[a-zA-Z0-9_-]{11}$/;
  const trimmed = input.trim();
  if (idPattern.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") throw new Error();
    let id: string | null = null;
    if (url.hostname === "youtu.be") id = url.pathname.slice(1);
    else if (
      ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)
    ) {
      id =
        url.pathname === "/watch"
          ? url.searchParams.get("v")
          : /^\/(embed|shorts)\//.test(url.pathname)
            ? url.pathname.split("/")[2]
            : null;
    }
    if (id && idPattern.test(id)) return id;
  } catch {
    /* Return a single validation error for all unsupported input. */
  }
  throw new Error(
    "Enter an 11-character YouTube ID or a supported HTTPS YouTube URL.",
  );
}
