import { THOR_URLS } from "./thorDefinitions";

const discoveryCache = new Map<string, string>();

export function normalizeThorPageUrl(input: string): URL {
  const candidate = input.trim();
  if (!candidate) throw new Error("Enter a ThorMobile course URL.");
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `http://${candidate}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("The course URL must begin with http:// or https://.");
  const hostname = url.hostname.toLowerCase();
  if (hostname !== "thormobile14.net" && !hostname.endsWith(".thormobile14.net")) {
    throw new Error("Enter a public thormobile14.net course address.");
  }
  url.hash = "";
  url.search = "";
  return url;
}

function assertThorMobileUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  if (hostname !== "thormobile14.net" && !hostname.endsWith(".thormobile14.net")) {
    throw new Error("ThorMobile redirected outside its approved data service.");
  }
}

async function safeFetch(url: URL): Promise<Response> {
  assertThorMobileUrl(url);
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(8_000),
    headers: { Accept: "text/html,application/javascript,application/xml,text/xml,*/*" },
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new Error("ThorMobile returned an invalid redirect.");
    return safeFetch(new URL(location, url));
  }
  return response;
}

export async function discoverThorXmlUrl(pageInput: string = THOR_URLS.livePage): Promise<{ pageUrl: string; xmlUrl: string }> {
  const pageUrl = normalizeThorPageUrl(pageInput);
  const cacheKey = pageUrl.toString();
  const cached = discoveryCache.get(cacheKey);
  if (cached) return { pageUrl: cacheKey, xmlUrl: cached };

  if (pageUrl.pathname.toLowerCase().endsWith(".xml")) {
    assertThorMobileUrl(pageUrl);
    return { pageUrl: cacheKey, xmlUrl: cacheKey };
  }

  const pageResponse = await safeFetch(pageUrl);
  if (!pageResponse.ok) throw new Error(`Course page returned HTTP ${pageResponse.status}.`);
  const html = await pageResponse.text();
  if (!/ThorMobile/i.test(html)) throw new Error("This does not appear to be a ThorMobile page.");

  const configMatch = html.match(/<script[^>]+src=["']([^"']*configuration\/configuration\.js[^"']*)["']/i);
  const configUrl = new URL(configMatch?.[1] ?? "../configuration/configuration.js", pageUrl);
  const configResponse = await safeFetch(configUrl);
  if (!configResponse.ok) throw new Error(`ThorMobile configuration returned HTTP ${configResponse.status}.`);
  const config = await configResponse.text();
  const xmlMatch = config.match(/XmlFilePath\s*:\s*["']([^"']+)["']/i);
  if (!xmlMatch?.[1]) throw new Error("The ThorMobile data-file setting could not be found.");

  // XmlFilePath is evaluated by the browser relative to the displayed page,
  // not relative to configuration.js itself.
  const xmlUrl = new URL(xmlMatch[1], pageUrl);
  assertThorMobileUrl(xmlUrl);
  discoveryCache.set(cacheKey, xmlUrl.toString());
  return { pageUrl: cacheKey, xmlUrl: xmlUrl.toString() };
}
