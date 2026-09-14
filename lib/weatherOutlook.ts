export interface WeatherOutlook {
  precipitationChance30: number | null;
  precipitationChance60: number | null;
  precipitationChance3Hours: number | null;
  thunderstormIn3Hours: boolean;
  provider: string;
}

export interface WaitingEstimate {
  label: "LIKELY" | "UNCERTAIN" | "UNLIKELY";
  detail: string;
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
