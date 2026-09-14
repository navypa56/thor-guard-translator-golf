export const THOR_URLS = {
  livePage: "http://prescottlakes.thormobile14.net/mobile/",
  liveXml: "http://prescottlakes.thormobile14.net/AZ0091.xml",
  documentation: "https://thorguard.com/download-category/support-documents/",
  education: "https://thorguard.com/lightning-101/",
} as const;

export const DEFAULT_THOR_PAGE_URL = THOR_URLS.livePage;

export type ReadingKey = "lhl" | "di" | "ad" | "fcc";

export interface ReadingDefinition {
  label: string;
  explanation: string;
  verified: boolean;
  source: string;
}

// Abbreviation expansions are intentionally omitted until they can be verified in
// Thor Guard's maintained Data Reference Guide or Interpretation Sheet. Keeping
// these definitions here lets maintainers update wording without touching the UI.
export const READING_DEFINITIONS: Record<ReadingKey, ReadingDefinition> = {
  lhl: {
    label: "LHL",
    explanation: "A live Thor Guard reading. Its precise definition still needs verification in the current official documentation.",
    verified: false,
    source: THOR_URLS.documentation,
  },
  di: {
    label: "DI",
    explanation: "A live Thor Guard reading. Its precise definition still needs verification in the current official documentation.",
    verified: false,
    source: THOR_URLS.documentation,
  },
  ad: {
    label: "AD",
    explanation: "A live Thor Guard reading. Its precise definition still needs verification in the current official documentation.",
    verified: false,
    source: THOR_URLS.documentation,
  },
  fcc: {
    label: "FCC",
    explanation: "A live Thor Guard reading. Its precise definition still needs verification in the current official documentation.",
    verified: false,
    source: THOR_URLS.documentation,
  },
};

// These are exact status tokens published by the Prescott Lakes ThorMobile XML.
// The ThorMobile client maps them to ALL CLEAR, CAUTION, WARNING, and RED ALERT.
export const VERIFIED_ALL_CLEAR_STATUS = "AllClear";
export const RED_ALERT_STATUS = "RedAlert";

export const SYSTEM_FAILURE_RESULTS = new Set([
  "CleanSensor",
  "SystemFailure",
  "SensorFailure",
  "TestFailure",
]);
