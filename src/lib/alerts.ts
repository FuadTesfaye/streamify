type Event = { kind: string; user_id: string | null; created_at: Date };
export function securityAlerts(events: Event[], now: number) {
  const recent = events.filter(
    (event) => now - event.created_at.getTime() < 10 * 60_000,
  );
  const alerts: string[] = [];
  const denials = recent.filter((event) =>
    ["access_denied", "login_denied"].includes(event.kind),
  ).length;
  if (denials >= 5)
    alerts.push(
      `${denials} login or authorization denials in the last 10 minutes. Review recent activity.`,
    );
  if (recent.some((event) => event.kind === "rate_limit_exceeded"))
    alerts.push(
      "Rate limits have been exceeded in the last 10 minutes. Review the event references for affected endpoints.",
    );
  const challenged = new Map<string, number>();
  for (const event of events)
    if (
      event.kind === "browser_challenged" &&
      event.user_id &&
      now - event.created_at.getTime() < 86400_000
    )
      challenged.set(event.user_id, (challenged.get(event.user_id) ?? 0) + 1);
  if ([...challenged.values()].some((count) => count >= 3))
    alerts.push(
      "An account requested at least three browser verifications in the last 24 hours. This may warrant an access review.",
    );
  return alerts;
}
