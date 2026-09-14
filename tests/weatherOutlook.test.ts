import { describe, expect, it } from "vitest";
import { waitingEstimate } from "../lib/weatherOutlook";

describe("weather-based waiting estimate", () => {
  it("keeps missing forecasts uncertain", () => {
    expect(waitingEstimate(null, false).label).toBe("UNCERTAIN");
  });

  it("treats a forecast thunderstorm as unlikely regardless of rain percentage", () => {
    expect(waitingEstimate(10, true).label).toBe("UNLIKELY");
  });
});
