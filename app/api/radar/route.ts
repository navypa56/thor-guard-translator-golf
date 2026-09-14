import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RainViewerResponse {
  host?: string;
  radar?: { past?: Array<{ time: number; path: string }> };
}

export async function GET() {
  try {
    const response = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Radar service returned HTTP ${response.status}.`);
    const data = (await response.json()) as RainViewerResponse;
    const latest = data.radar?.past?.at(-1);
    if (!data.host?.startsWith("https://") || !latest?.path) throw new Error("Radar metadata was incomplete.");
    return NextResponse.json({ host: data.host, path: latest.path, time: latest.time }, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    console.error("Unable to retrieve radar metadata:", error);
    return NextResponse.json({ error: "Radar is temporarily unavailable." }, { status: 503 });
  }
}
