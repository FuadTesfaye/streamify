import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { redisCommand } from "@/lib/redis";
export async function GET() {
  try {
    const cfg = config();
    await Promise.all([
      db.query("SELECT 1"),
      redisCommand(cfg.REDIS_URL, ["PING"]),
    ]);
    return NextResponse.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
