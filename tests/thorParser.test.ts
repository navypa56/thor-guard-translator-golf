import { describe, expect, it } from "vitest";
import { interpretThor } from "../lib/interpretThor";
import { parseThorXml } from "../lib/thorParser";
import { normalizeThorPageUrl } from "../lib/thorSource";

const xml = (status: string, extras = "") => `<?xml version="1.0"?><loadmovie><thordata>
  <displayname>Prescott Lakes</displayname><localtime>1:23:45 PM 09/13/2026</localtime>
  <emergencystate>None</emergencystate><testresult>Pass</testresult>
  <lightningalert>${status}</lightningalert><ad>2</ad><di>1.6</di><lhl>3</lhl><fcc>1</fcc>
  <isdataold>False</isdataold>${extras}</thordata></loadmovie>`;

describe("Thor data safety behavior", () => {
  it("accepts and normalizes a course ThorMobile URL", () => {
    expect(normalizeThorPageUrl("prescottlakes.thormobile14.net/mobile/").toString()).toBe("http://prescottlakes.thormobile14.net/mobile/");
  });
  it("parses normalized live fields", () => {
    const result = parseThorXml(xml("RedAlert"), "2026-09-13T20:00:00.000Z");
    expect(result).toMatchObject({ location: "Prescott Lakes", officialStatus: "RedAlert", lhl: 3, di: 1.6, ad: 2, fcc: 1 });
  });
  it("allows green only for the explicit AllClear token", () => {
    expect(interpretThor(parseThorXml(xml("AllClear"))).tone).toBe("green");
    expect(interpretThor(parseThorXml(xml("Unknown"))).tone).toBe("gray");
  });
  it("keeps Red Alert dominant regardless of numerical readings", () => {
    const view = interpretThor(parseThorXml(xml("RedAlert")));
    expect(view.tone).toBe("red");
    expect(view.headline).toBe("SEEK SHELTER");
    expect(view.summary.toLowerCase()).not.toContain("resume");
  });
  it("fails closed on malformed required fields", () => {
    expect(() => parseThorXml("<loadmovie><lhl>3</lhl></loadmovie>")).toThrow();
  });
  it("fails closed when the official source marks data old", () => {
    const stale = xml("AllClear").replace("<isdataold>False</isdataold>", "<isdataold>True</isdataold>");
    expect(interpretThor(parseThorXml(stale)).tone).toBe("gray");
  });
});
