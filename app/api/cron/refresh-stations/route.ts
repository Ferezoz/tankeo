import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { fetchAndParseCreFeeds, type StationsData } from "@/app/lib/creFeeds";

export const maxDuration = 30;

const BLOB_PATHNAME = "stations-data.json";

async function fetchWithRetries(maxAttempts = 3): Promise<StationsData> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchAndParseCreFeeds();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastErr;
}

export async function GET(request: NextRequest) {
  // Vercel sets this automatically for cron-triggered requests when
  // CRON_SECRET is configured — guards the endpoint from being triggered by
  // anyone who finds the URL. No-ops if CRON_SECRET isn't set.
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const data = await fetchWithRetries();
    await put(BLOB_PATHNAME, JSON.stringify(data), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Leave the existing blob in place — /api/stations falls back to serving
    // stale data (or fetching CRE directly) rather than losing all data over
    // one failed run.
    console.error("Cron refresh failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
