import {
  RED_ALERT_STATUS,
  SYSTEM_FAILURE_RESULTS,
  VERIFIED_ALL_CLEAR_STATUS,
} from "./thorDefinitions";
import type { ThorData } from "./thorParser";

export type DisplayTone = "green" | "yellow" | "red" | "gray";

export interface ThorInterpretation {
  tone: DisplayTone;
  eyebrow: string;
  headline: string;
  summary: string;
  activityExplanation: string;
  trend: string;
  allClearExplanation: string;
  dischargeExplanation: string;
}

const unavailable: ThorInterpretation = {
  tone: "gray",
  eyebrow: "STATUS NOT VERIFIED",
  headline: "LIVE DATA UNAVAILABLE",
  summary: "Thor Guard data could not be verified. Check the official Thor Guard page before relying on this display.",
  activityExplanation: "Current electrical activity could not be verified.",
  trend: "Unknown — live status is unavailable.",
  allClearExplanation: "No All Clear has been verified.",
  dischargeExplanation: "Current readings could not be verified.",
};

export function unavailableInterpretation(): ThorInterpretation {
  return unavailable;
}

export function interpretThor(data: ThorData): ThorInterpretation {
  // ThorMobile marks stale data independently of its alert token. Stale, testing,
  // and failed-system states must never be interpreted as an All Clear.
  if (data.isDataOld || data.officialStatus === "Unknown" || data.testResult === "Testing" || SYSTEM_FAILURE_RESULTS.has(data.testResult)) {
    return unavailable;
  }

  // ThorMobile's emergency states override its lightning code in the official UI.
  if (data.emergencyState === "ForcedAlert" || data.emergencyState === "UnitAlert") {
    return {
      tone: "red",
      eyebrow: "OFFICIAL EMERGENCY STATE",
      headline: "SEEK SHELTER",
      summary: "Thor Guard has issued an emergency alert. Stop outdoor play and remain sheltered until the system gives the All Clear.",
      activityExplanation: "An official emergency state is active. Do not use individual readings to judge safety.",
      trend: "Shelter required — numerical trends do not override the alert.",
      allClearExplanation: "Remain sheltered. No official All Clear is active.",
      dischargeExplanation: "Displayed only as a raw reading; it does not reduce the alert level.",
    };
  }

  // Source-of-truth rule: an official RedAlert always wins over every number.
  if (data.officialStatus === RED_ALERT_STATUS) {
    return {
      tone: "red",
      eyebrow: "OFFICIAL RED ALERT",
      headline: "SEEK SHELTER",
      summary: "Thor Guard has issued a Red Alert. Stop outdoor play and remain sheltered until the system gives the All Clear.",
      activityExplanation: "The official Thor Guard alert is active. Individual readings cannot make conditions safe.",
      trend: "Shelter required — numerical trends do not override the alert.",
      allClearExplanation: "Remain sheltered. Wait for the live Thor Guard source to explicitly report All Clear.",
      dischargeExplanation: "Displayed only as a raw reading; it does not reduce the alert level.",
    };
  }

  // Only the exact ThorMobile AllClear token may produce a green card. This is
  // supported by ThorMobile's own client mapping and Thor Guard's Lightning 101
  // explanation that activities should not resume until local energy is cleared.
  if (data.officialStatus === VERIFIED_ALL_CLEAR_STATUS) {
    return {
      tone: "green",
      eyebrow: "OFFICIAL STATUS",
      headline: "ALL CLEAR",
      summary: "Conditions are currently clear according to Thor Guard.",
      activityExplanation: "The live Prescott Lakes source currently reports All Clear.",
      trend: "No trend is inferred from a single live reading.",
      allClearExplanation: "The official live source explicitly reports All Clear.",
      dischargeExplanation: "Shown as a raw value; no unverified meaning is applied.",
    };
  }

  if (data.officialStatus === "Caution" || data.officialStatus === "Warning") {
    return {
      tone: "yellow",
      eyebrow: `OFFICIAL ${data.officialStatus.toUpperCase()}`,
      headline: data.officialStatus === "Warning" ? "WARNING" : "CAUTION",
      summary: "Electrical conditions require attention. Be prepared to seek shelter and follow course instructions.",
      activityExplanation: `The official live source reports ${data.officialStatus}.`,
      trend: "No trend is inferred from a single live reading.",
      allClearExplanation: "No official All Clear is active.",
      dischargeExplanation: "Shown as a raw value; no unverified meaning is applied.",
    };
  }

  return unavailable;
}
