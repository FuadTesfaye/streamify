import { verifyEmbedToken } from "@/lib/embed-token";
import { config } from "@/lib/config";
import { EmbedPlayerClient } from "./client";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let error: string | null = null;
  let viewer = "";

  try {
    const payload = verifyEmbedToken(token);
    viewer = payload.viewer;
  } catch (err: unknown) {
    error =
      err instanceof Error
        ? err.message
        : "This embed link has expired or is invalid. Embed tokens cannot be copied or shared.";
  }

  const appOrigin = config().APP_ORIGIN;

  return (
    <main className="embed-container">
      {error ? (
        <div className="embed-expired-card">
          <div className="embed-expired-icon">🔒</div>
          <h2>Playback Authorization Expired</h2>
          <p>{error}</p>
          <span className="embed-hint">
            To prevent link sharing, embed links are ephemeral and expire quickly upon copying or session expiration.
          </span>
        </div>
      ) : (
        <EmbedPlayerClient token={token} origin={appOrigin} initialViewer={viewer} />
      )}
    </main>
  );
}
