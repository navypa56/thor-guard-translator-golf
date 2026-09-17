export const THOR_URLS = {
  livePage: "http://prescottlakes.thormobile14.net/mobile/",
  liveXml: "http://prescottlakes.thormobile14.net/AZ0091.xml",
  documentation: "https://thorguard.com/download-category/support-documents/",
  education: "https://thorguard.com/lightning-101/",
  dataReference: "https://thorguard.com/download/data-reference-guide/",
  interpretationSheet: "https://thorguard.com/download/interpretation-sheet/",
} as const;

export const DEFAULT_THOR_PAGE_URL = THOR_URLS.livePage;

export type ReadingKey = "lhl" | "di" | "ad" | "fcc";

export interface ReadingDefinition {
  label: string;
  plainEnglish: string;
  explanation: string;
  verified: boolean;
  source: string;
}

// Definitions below translate Thor Guard's maintained Data Reference Guide and
// Interpretation Sheet into plain language. The official alert state remains the
// safety authority; none of these individual values overrides it.
export const READING_DEFINITIONS: Record<ReadingKey, ReadingDefinition> = {
  lhl: {
    label: "LHL",
    plainEnglish: "Imagine the sensor feeling how much electricity is building in the air across the wider area around the course. Zero means very little buildup. As the number climbs toward 9, the atmosphere is becoming more capable of producing lightning. This is not a distance and not a count of lightning bolts.",
    explanation: "Lightning Hazard Level: Thor Guard’s 0–9 measure of electrical energy and lightning potential across the sensor’s wider coverage area.",
    verified: true,
    source: THOR_URLS.dataReference,
  },
  di: {
    label: "DI",
    plainEnglish: "Imagine asking, “Is lightning danger forming close to us right now?” Zero means the sensor is not seeing that nearby danger pattern. A rising number means the electrical energy close to the course is changing more strongly and needs more attention. The official alert—not this number alone—decides what people should do.",
    explanation: "Dynamic Index: Thor Guard’s measure of changing electrical energy and lightning potential in the area closest to the sensor.",
    verified: true,
    source: THOR_URLS.dataReference,
  },
  ad: {
    label: "AD",
    plainEnglish: "Imagine a quiet-time clock after dangerous electrical activity. New activity pushes the clock back up. If the atmosphere stays quiet, it counts down toward zero. Reaching zero helps Thor Guard decide when it can issue an All Clear, but the number itself is not permission to go outside.",
    explanation: "Activity Detector: a quiet-time countdown that resets when the system detects new electrical activity and moves toward zero when conditions remain quiet.",
    verified: true,
    source: THOR_URLS.interpretationSheet,
  },
  fcc: {
    label: "FCC",
    plainEnglish: "Imagine a storm activity counter. It goes up when the sensor recognizes electrical discharges in its wider area. A number climbing quickly means the storm is electrically busy. It is not a mileage reading, and one lightning flash can contain more than one discharge.",
    explanation: "Field Collapse Count: a count representing electrical discharges detected within the sensor’s wider coverage area.",
    verified: true,
    source: THOR_URLS.dataReference,
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
