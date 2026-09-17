import { describe, expect, it } from "vitest";
import { playOutlook, waitingEstimate, type WeatherOutlook } from "../lib/weatherOutlook";

describe("weather-based waiting estimate", () => {
  it("keeps missing forecasts uncertain", () => {
    expect(waitingEstimate(null, false).label).toBe("UNCERTAIN");
  });

  it("treats a forecast thunderstorm as unlikely regardless of rain percentage", () => {
    expect(waitingEstimate(10, true).label).toBe("UNLIKELY");
  });
});

const weather = (probabilities: Array<number | null>, codes: Array<number | null> = probabilities.map(() => 0)): WeatherOutlook => ({
  precipitationChance30: null,
  precipitationChance60: null,
  precipitationChance2Hours: null,
  precipitationChance3Hours: null,
  precipitationProbabilities: probabilities,
  weatherCodes: codes,
  thunderstormIn3Hours: codes.some((code) => code !== null && code >= 95),
  provider: "Test",
});

describe("remaining-play outlook", () => {
  it("leads with the current All Clear when forecast data is unavailable", () => {
    expect(playOutlook(null, true)).toMatchObject({
      headline: "Play continues now under the current All Clear",
      confidence: "LOW",
    });
  });

  it("reports favorable conditions when no disruptive period appears", () => {
    expect(playOutlook(weather(Array(12).fill(20))).level).toBe("FAVORABLE");
  });

  it("warns of a possible interruption within 30 to 60 minutes", () => {
    expect(playOutlook(weather([20, 20, 70, 70])).headline).toContain("30–60 minutes");
  });

  it("treats forecast thunder as a strong interruption signal", () => {
    expect(playOutlook(weather(Array(12).fill(10), [95, ...Array(11).fill(0)]))).toMatchObject({
      level: "INTERRUPTION POSSIBLE",
      confidence: "HIGH",
    });
  });
});
