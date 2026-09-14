export interface ThorData {
  location: string;
  status: string;
  officialStatus: string;
  lhl: number | null;
  di: number | null;
  ad: number | null;
  fcc: number | null;
  sourceUpdatedAt: string;
  retrievedAt: string;
  isDataOld: boolean;
  emergencyState: string;
  testResult: string;
  sourcePageUrl?: string;
  latitude: number | null;
  longitude: number | null;
}

function value(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() ?? null;
}

function numberValue(xml: string, tag: string): number | null {
  const raw = value(xml, tag);
  if (raw === null || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function decodeThorXml(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const utf16 = bytes[0] === 0xff && bytes[1] === 0xfe;
  return new TextDecoder(utf16 ? "utf-16le" : "utf-8").decode(bytes).replace(/^\uFEFF/, "");
}

export function parseThorXml(xml: string, retrievedAt = new Date().toISOString()): ThorData {
  const location = value(xml, "displayname");
  const officialStatus = value(xml, "lightningalert");
  const sourceUpdatedAt = value(xml, "localtime");
  const emergencyState = value(xml, "emergencystate");
  const testResult = value(xml, "testresult");
  const latitudeValue = numberValue(xml, "latitude");
  const longitudeValue = numberValue(xml, "longitude");
  const latitude = latitudeValue === null ? null : value(xml, "latdirection") === "S" ? -latitudeValue : latitudeValue;
  const longitude = longitudeValue === null ? null : value(xml, "londirection") === "W" ? -longitudeValue : longitudeValue;

  if (!location || !officialStatus || !sourceUpdatedAt || !emergencyState || !testResult) {
    throw new Error("Thor Guard XML is missing required fields.");
  }

  return {
    location,
    status: officialStatus,
    officialStatus,
    lhl: numberValue(xml, "lhl"),
    di: numberValue(xml, "di"),
    ad: numberValue(xml, "ad"),
    fcc: numberValue(xml, "fcc"),
    sourceUpdatedAt,
    retrievedAt,
    isDataOld: value(xml, "isdataold")?.toLowerCase() === "true",
    emergencyState,
    testResult,
    latitude,
    longitude,
  };
}
