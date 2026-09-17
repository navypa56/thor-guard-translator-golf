export interface WeatherOutlook {
  precipitationChance30: number | null;
  precipitationChance60: number | null;
  precipitationChance2Hours: number | null;
  precipitationChance3Hours: number | null;
  weatherCodes: Array<number | null>;
  precipitationProbabilities: Array<number | null>;
  thunderstormIn3Hours: boolean;
  provider: string;
  updatedAt?: string;
}

export interface WaitingEstimate {
  label: "LIKELY" | "UNCERTAIN" | "UNLIKELY";
  detail: string;
}

export interface PlayOutlook {
  level: "FAVORABLE" | "WATCH" | "INTERRUPTION POSSIBLE" | "UNCERTAIN";
  headline: string;
  detail: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
}

const thunderstormCode = (code: number | null) => code !== null && code >= 95;

// Planning-only nowcast built from Open-Meteo's 15-minute forecast periods.
// These editable bands communicate when disruptive weather may become relevant;
// they are not Thor Guard thresholds, lightning probabilities, or safety clearance.
// The official Thor Guard alert always overrides this outlook.
export function playOutlook(weather: WeatherOutlook | null): PlayOutlook {
  if (!weather || weather.precipitationProbabilities.length < 4) {
    return {
      level: "UNCERTAIN",
      headline: "Not enough weather data for a play estimate",
      detail: "Keep watching the official Thor Guard status and radar.",
      confidence: "LOW",
    };
  }

  const disruptivePeriod = weather.precipitationProbabilities.findIndex((chance, index) =>
    thunderstormCode(weather.weatherCodes[index] ?? null) || (chance !== null && chance >= 60),
  );

  if (disruptivePeriod < 0) {
    return {
      level: "FAVORABLE",
      headline: "Play is likely to continue for at least 2–3 hours",
      detail: "The short-range forecast does not currently show a strong interruption signal.",
      confidence: weather.precipitationProbabilities.filter((value) => value !== null).length >= 8 ? "MEDIUM" : "LOW",
    };
  }

  const minutes = disruptivePeriod * 15;
  if (minutes < 30) {
    return {
      level: "INTERRUPTION POSSIBLE",
      headline: "Play could be halted within about 30 minutes",
      detail: "The short-range forecast shows disruptive weather close to the course.",
      confidence: thunderstormCode(weather.weatherCodes[disruptivePeriod] ?? null) ? "HIGH" : "MEDIUM",
    };
  }
  if (minutes < 60) {
    return {
      level: "INTERRUPTION POSSIBLE",
      headline: "Play could be halted in about 30–60 minutes",
      detail: "Consider how much of the round remains and keep watching the official status.",
      confidence: thunderstormCode(weather.weatherCodes[disruptivePeriod] ?? null) ? "HIGH" : "MEDIUM",
    };
  }
  if (minutes < 120) {
    return {
      level: "WATCH",
      headline: "A weather interruption is possible in about 1–2 hours",
      detail: "Conditions may allow more play, but finishing a full round is uncertain.",
      confidence: "MEDIUM",
    };
  }
  return {
    level: "WATCH",
    headline: "Play is likely to continue for roughly 2 hours",
    detail: "A later weather interruption is possible within the 3-hour outlook.",
    confidence: "LOW",
  };
}

// This is a convenience estimate for deciding whether to keep waiting indoors;
// it is not a Thor Guard interpretation or an All Clear prediction. The numeric
// input is Open-Meteo's published precipitation probability. The 30/60 cutoffs
// are editable presentation bands, not safety thresholds. Thor Guard's live
// alert always remains authoritative regardless of this result.
export function waitingEstimate(chance: number | null, thunderstormIn3Hours: boolean): WaitingEstimate {
  if (chance === null) return { label: "UNCERTAIN", detail: "Not enough forecast data" };
  if (thunderstormIn3Hours || chance >= 60) return { label: "UNLIKELY", detail: `${chance}% precipitation forecast` };
  if (chance <= 30) return { label: "LIKELY", detail: `${chance}% precipitation forecast` };
  return { label: "UNCERTAIN", detail: `${chance}% precipitation forecast` };
}
