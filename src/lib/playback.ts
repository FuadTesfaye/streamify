import { rows, tx } from "./db";
import {
  authorizeLesson,
  checkLockedSession,
  lockAccount,
  type Viewer,
} from "./authorization";
import { assert } from "./errors";
import { LEASE_MS } from "./policy";
import { audit } from "./security";
export interface PlaybackProvider {
  name: "youtube";
  launch(videoId: string): { provider: "youtube"; videoId: string };
}
const youtube: PlaybackProvider = {
  name: "youtube",
  launch: (videoId) => ({ provider: "youtube", videoId }),
};
export async function launchPlayback(user: Viewer, lessonId: string) {
  return tx(async (client) => {
    await lockAccount(client, user.id);
    await checkLockedSession(client, user);
    const lesson = await authorizeLesson(user, lessonId, client);
    const active = await rows(
      "SELECT id FROM playback_sessions WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now()",
      [user.id],
      client,
    );
    assert(
      !active.length,
      409,
      "PLAYBACK_LIMIT",
      "Another playback is active. End it in Account security or wait 90 seconds.",
    );
    const expiresAt = new Date(Date.now() + LEASE_MS);
    const [session] = await rows<{ id: string }>(
      "INSERT INTO playback_sessions(user_id,session_id,browser_id,lesson_id,expires_at) VALUES($1,$2,$3,$4,$5) RETURNING id",
      [user.id, user.sessionId, user.browserId, lessonId, expiresAt],
      client,
    );
    await audit("playback_granted", user.id, session.id, client);
    return {
      playbackSessionId: session.id,
      ...youtube.launch(lesson.video_id),
      expiresAt: expiresAt.toISOString(),
    };
  });
}
export async function heartbeat(user: Viewer, id: string) {
  return tx(async (client) => {
    await lockAccount(client, user.id);
    await checkLockedSession(client, user);
    const [session] = await rows<{ lesson_id: string }>(
      "SELECT lesson_id FROM playback_sessions WHERE id=$1 AND user_id=$2 AND session_id=$3 AND browser_id=$4 AND revoked_at IS NULL AND expires_at>now()",
      [id, user.id, user.sessionId, user.browserId],
      client,
    );
    assert(session, 403, "PLAYBACK_EXPIRED");
    await authorizeLesson(user, session.lesson_id, client);
    const expiresAt = new Date(Date.now() + LEASE_MS);
    await client.query(
      "UPDATE playback_sessions SET expires_at=$1 WHERE id=$2",
      [expiresAt, id],
    );
    return { expiresAt: expiresAt.toISOString() };
  });
}
export async function releasePlayback(user: Viewer, id: string) {
  await tx(async (client) => {
    await lockAccount(client, user.id);
    await client.query(
      "UPDATE playback_sessions SET revoked_at=now() WHERE id=$1 AND user_id=$2 AND session_id=$3 AND browser_id=$4",
      [id, user.id, user.sessionId, user.browserId],
    );
    await audit("playback_released", user.id, undefined, client);
  });
}
