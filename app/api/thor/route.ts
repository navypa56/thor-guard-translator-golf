import { type NextRequest, NextResponse } from "next/server";
import { THOR_URLS } from "@/lib/thorDefinitions";
import { decodeThorXml, parseThorXml } from "@/lib/thorParser";
import { discoverThorXmlUrl } from "@/lib/thorSource";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const requestedPage = request.nextUrl.searchParams.get("source") ?? THOR_URLS.livePage;
    const source = await discoverThorXmlUrl(requestedPage);
    const liveUrl = new URL(source.xmlUrl);
    liveUrl.searchParams.set("ms", Date.now().toString());
    const response = await fetch(liveUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/xml,text/xml,*/*" },
    });

    if (!response.ok) throw new Error(`Thor Guard returned HTTP ${response.status}.`);

    const data = {
      ...parseThorXml(decodeThorXml(await response.arrayBuffer())),
      sourcePageUrl: source.pageUrl,
    };
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to retrieve Thor Guard data:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Live Thor Guard data could not be verified." },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
