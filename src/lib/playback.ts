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
import { config } from "./config";
import {
  launchProviderPlayback,
  type PlaybackDescriptor,
  type ProviderType,
} from "./providers";

export type { PlaybackDescriptor, ProviderType };

export async function launchPlayback(
  user: Viewer,
  lessonId: string,
): Promise<
  {
    playbackSessionId: string;
    expiresAt: string;
  } & PlaybackDescriptor
> {
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

    const descriptor = await launchProviderPlayback(
      {
        id: lesson.id,
        title: lesson.title,
        videoId: lesson.video_id,
        provider: lesson.provider,
        visibility: lesson.visibility,
        playbackPolicy: lesson.playback_policy,
      },
      {
        userId: user.id,
        userEmail: user.email,
        sessionId: user.sessionId,
        browserId: user.browserId,
        appOrigin: config().APP_ORIGIN,
      },
    );

    return {
      playbackSessionId: session.id,
      expiresAt: expiresAt.toISOString(),
      ...descriptor,
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
