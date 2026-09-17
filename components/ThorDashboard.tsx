"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_THOR_PAGE_URL, READING_DEFINITIONS, THOR_URLS, type ReadingKey } from "@/lib/thorDefinitions";
import { interpretThor, unavailableInterpretation } from "@/lib/interpretThor";
import type { ThorData } from "@/lib/thorParser";
import { ThorRadarMap } from "@/components/ThorRadarMap";
import { waitingEstimate, type WeatherOutlook } from "@/lib/weatherOutlook";

const readingKeys: ReadingKey[] = ["lhl", "di", "ad", "fcc"];
const REFRESH_SECONDS = 5;

const insights: Array<{
  key: ReadingKey;
  icon: string;
  title: string;
  explanation: (view: ReturnType<typeof interpretThor>) => string;
}> = [
  { key: "lhl", icon: "ϟ", title: "Wider-area lightning potential", explanation: (view) => view.activityExplanation },
  { key: "di", icon: "↗", title: "Nearby danger changing", explanation: (view) => view.trend },
  { key: "ad", icon: "◎", title: "Quiet-time countdown", explanation: (view) => view.allClearExplanation },
  { key: "fcc", icon: "⌁", title: "Discharges detected", explanation: (view) => view.dischargeExplanation },
];

function ExternalLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return <a className={className} href={href} target="_blank" rel="noreferrer">{children}<span aria-hidden="true"> ↗</span></a>;
}

function formatTime(value?: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

function formatAge(value?: string, now = Date.now()) {
  if (!value) return "not yet synced";
  const seconds = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

function cachedReadingKey(source: string) {
  return `thor-last-verified:${source}`;
}

function readCachedReading(source: string): ThorData | null {
  const key = cachedReadingKey(source);
  const cached = window.localStorage.getItem(key);
  if (!cached) return null;
  try {
    const restored = JSON.parse(cached) as ThorData;
    return restored?.officialStatus && restored.officialStatus !== "Unknown" && restored.retrievedAt ? restored : null;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function ThorDashboard() {
  const [data, setData] = useState<ThorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string>(DEFAULT_THOR_PAGE_URL);
  const [draftUrl, setDraftUrl] = useState<string>(DEFAULT_THOR_PAGE_URL);
  const [sourceReady, setSourceReady] = useState(false);
  const [secondsToRefresh, setSecondsToRefresh] = useState(REFRESH_SECONDS);
  const [nextRefreshAt, setNextRefreshAt] = useState(() => Date.now() + REFRESH_SECONDS * 1000);
  const [outlook, setOutlook] = useState<WeatherOutlook | null>(null);
  const [trainingMode, setTrainingMode] = useState(false);
  const [now, setNow] = useState(Date.now());
  const refreshInProgress = useRef(false);

  useEffect(() => {
    const initialize = window.setTimeout(() => {
      const saved = window.localStorage.getItem("thor-course-url") ?? DEFAULT_THOR_PAGE_URL;
      setSourceUrl(saved);
      setDraftUrl(saved);
      setData(readCachedReading(saved));
      setSourceReady(true);
    }, 0);
    return () => window.clearTimeout(initialize);
  }, []);

  const refresh = useCallback(async () => {
    if (!sourceReady || refreshInProgress.current) return;
    refreshInProgress.current = true;
    setLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4_500);
    try {
      const response = await fetch(`/api/thor?source=${encodeURIComponent(sourceUrl)}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Live data unavailable");
      }
      const nextData = await response.json() as ThorData;
      if (interpretThor(nextData).tone === "gray") throw new Error("The newest response was not verified.");
      setData(nextData);
      window.localStorage.setItem(cachedReadingKey(sourceUrl), JSON.stringify(nextData));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      window.clearTimeout(timeout);
      setNextRefreshAt(Date.now() + REFRESH_SECONDS * 1000);
      setLoading(false);
      refreshInProgress.current = false;
    }
  }, [sourceReady, sourceUrl]);

  useEffect(() => {
    if (!sourceReady) return;
    const initial = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, REFRESH_SECONDS * 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refresh, sourceReady]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
      setSecondsToRefresh(Math.max(0, Math.ceil((nextRefreshAt - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [nextRefreshAt]);

  useEffect(() => {
    if (data?.latitude === null || data?.longitude === null || data?.latitude === undefined || data?.longitude === undefined) {
      return;
    }
    const controller = new AbortController();
    fetch(`/api/outlook?lat=${data.latitude}&lon=${data.longitude}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => setOutlook(value))
      .catch(() => setOutlook(null));
    return () => controller.abort();
  }, [data?.latitude, data?.longitude]);

  function saveCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draftUrl.trim();
    if (!value) return;
    window.localStorage.setItem("thor-course-url", value);
    setData(readCachedReading(value));
    setSourceUrl(value);
  }

  function restoreDefault() {
    window.localStorage.removeItem("thor-course-url");
    setData(readCachedReading(DEFAULT_THOR_PAGE_URL));
    setDraftUrl(DEFAULT_THOR_PAGE_URL);
    setSourceUrl(DEFAULT_THOR_PAGE_URL);
  }

  const trainingData: ThorData = {
    location: "TRAINING — Prescott Lakes",
    status: "RedAlert",
    officialStatus: "RedAlert",
    lhl: 3,
    di: 1.6,
    ad: 2,
    fcc: 1,
    sourceUpdatedAt: "Simulated Red Alert scenario",
    retrievedAt: new Date().toISOString(),
    isDataOld: false,
    emergencyState: "None",
    testResult: "Pass",
    sourcePageUrl: sourceUrl,
    latitude: data?.latitude ?? 34.583,
    longitude: data?.longitude ?? -112.4,
  };
  const displayData = trainingMode ? trainingData : data;
  const view = displayData ? interpretThor(displayData) : unavailableInterpretation();
  const lastSyncAge = formatAge(data?.retrievedAt, now);
  const waiting30 = waitingEstimate(outlook?.precipitationChance30 ?? null, outlook?.thunderstormIn3Hours ?? false);
  const waiting60 = waitingEstimate(outlook?.precipitationChance60 ?? null, outlook?.thunderstormIn3Hours ?? false);

  return (
    <main>
      <div className="page-shell">
        <header className="masthead">
          <div className="brand-mark" aria-hidden="true">ϟ</div>
          <div>
            <p className="kicker">LIVE COURSE CONDITIONS</p>
            <h1>Thor Guard Translator</h1>
          </div>
          <button className={`training-toggle ${trainingMode ? "active" : ""}`} type="button" onClick={() => setTrainingMode((enabled) => !enabled)} aria-pressed={trainingMode}>
            Training mode: <strong>{trainingMode ? "On" : "Off"}</strong>
          </button>
          <div className={`live-pill ${failed && !data ? "offline" : ""}`}>
            <span className="live-dot" />{trainingMode ? "SIMULATION" : loading && data ? "UPDATING" : loading ? "CONNECTING" : failed && data ? "LAST UPDATE" : failed ? "UNAVAILABLE" : "LIVE"}
          </div>
        </header>

        <details className="course-picker">
          <summary><span><small>DATA SOURCE</small>{data?.location ?? "Choose your Thor Guard course"}</span><span className="course-change">Change course</span></summary>
          <form onSubmit={saveCourse}>
            <label htmlFor="thor-course-url">Course ThorMobile URL</label>
            <p>Paste the public Thor Guard page supplied by your golf course. This choice is saved only on this device.</p>
            <div className="url-row">
              <input id="thor-course-url" type="url" inputMode="url" value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} placeholder="http://yourcourse.thormobile14.net/mobile/" required />
              <button type="submit">Save &amp; connect</button>
            </div>
            <button className="default-button" type="button" onClick={restoreDefault}>Use Prescott Lakes default</button>
          </form>
        </details>

        <section className={`status-card tone-${view.tone}`} aria-live="polite">
          <div className="status-glow" />
          <p className="status-eyebrow"><span className="status-icon">{view.tone === "red" ? "!" : view.tone === "green" ? "✓" : view.tone === "yellow" ? "!" : "—"}</span>{view.eyebrow}</p>
          <h2>{view.headline}</h2>
          {trainingMode && <div className="training-banner"><strong>TRAINING MODE</strong> Simulated readings—not current conditions.</div>}
          {!trainingMode && data && <div className={`stored-banner ${loading || failed ? "" : "stored-banner-hidden"}`} aria-hidden={!loading && !failed}><strong>LAST SYNC: {lastSyncAge.toUpperCase()}</strong> Keeping this verified status visible while the next update is pending.</div>}
          <p className="status-summary">{view.summary}</p>
          <div className="status-meta">
            <span>{displayData?.location ?? "Selected course"}</span>
            <span>{trainingMode ? "Simulated" : "Official"} status: <strong>{displayData?.officialStatus ?? "Not verified"}</strong></span>
          </div>
        </section>

        <div className="source-verification">
          <div><strong>Confirm the official status</strong><span>Open the Thor Guard source used by this app.</span></div>
          <ExternalLink href={data?.sourcePageUrl ?? sourceUrl} className="verify-source-button">Verify on Official Thor Guard</ExternalLink>
        </div>

        <section className={`section-block alert-surface alert-${view.tone}`}>
          <div className="section-heading">
            <div><p className="section-number">01 / LIVE TRANSLATION</p><h2>What’s happening right now</h2></div>
            <div className="refresh-cluster"><span>{loading ? "Updating now…" : `Updates in ${secondsToRefresh}s`}</span><button className="refresh-button" onClick={refresh} disabled={loading} aria-label="Refresh live data">↻</button></div>
          </div>
          <div className="insight-grid">
            {insights.map((insight) => (
              <article key={insight.key}>
                <span className="insight-icon" aria-hidden="true">{insight.icon}</span>
                <div className="insight-copy">
                  <div className="insight-title-row">
                    <h3>{insight.title}</h3>
                    <span className="reading-chip"><b>{READING_DEFINITIONS[insight.key].label}</b> {displayData?.[insight.key] ?? "—"}</span>
                  </div>
                  <p>{insight.explanation(view)}</p>
                  <p className="plain-reading">{READING_DEFINITIONS[insight.key].plainEnglish}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <details className={`readings-card alert-surface alert-${view.tone}`}>
          <summary><span><span className="section-number">02 / RAW DATA</span>Show Thor Guard Numbers</span><span className="chevron">⌄</span></summary>
          <div className="reading-grid">
            {readingKeys.map((key) => (
              <div className="reading" key={key}>
                <div className="reading-label">{READING_DEFINITIONS[key].label}<span className={`info info-${key}`} tabIndex={0} role="note" aria-label={READING_DEFINITIONS[key].explanation}>i<span className="tooltip">{READING_DEFINITIONS[key].explanation}</span></span></div>
                <div className="reading-value">{displayData?.[key] ?? "—"}</div>
                <p className="reading-help">{READING_DEFINITIONS[key].plainEnglish}</p>
              </div>
            ))}
          </div>
          <p className="verification-note">These definitions translate Thor Guard’s official Data Reference Guide and Interpretation Sheet. The official alert status always controls the safety decision.</p>
        </details>

        {(view.tone === "red" || view.tone === "yellow") && (
          <section className={`waiting-card alert-${view.tone}`}>
            <div className="waiting-heading"><div><p className="section-number">WEATHER-BASED PLANNING ESTIMATE</p><h2>Wait at the clubhouse—or head home?</h2></div><span className="estimate-badge">NOT THOR GUARD</span></div>
            <div className="estimate-grid">
              <article><span>Play resuming within</span><strong>30 minutes</strong><b>{waiting30.label}</b><small>{waiting30.detail}</small></article>
              <article><span>Play resuming within</span><strong>60 minutes</strong><b>{waiting60.label}</b><small>{waiting60.detail}</small></article>
            </div>
            <p className="waiting-note">This is only a planning estimate from the weather forecast. It cannot predict Thor Guard’s All Clear. During a Red Alert, remain sheltered until the official system gives the All Clear.</p>
          </section>
        )}

        {displayData?.latitude !== null && displayData?.longitude !== null && displayData?.latitude !== undefined && displayData?.longitude !== undefined && (
          <section className="map-card">
            <div className="map-heading"><div><p className="section-number">LIVE RADAR</p><h2>Course map</h2></div><ExternalLink href={data.sourcePageUrl ?? sourceUrl}>Open official Thor map</ExternalLink></div>
            <ThorRadarMap latitude={displayData.latitude} longitude={displayData.longitude} />
            <div className="radar-legend" aria-label="Weather radar color guide">
              <div className="legend-title"><strong>Radar color guide</strong><span>Rain intensity</span></div>
              <div className="legend-scale" aria-hidden="true" />
              <div className="legend-labels"><span>Light</span><span>Moderate</span><span>Heavy</span><span>Very heavy</span></div>
            </div>
            <p className="map-credit">Radar overlay by <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>. The official ThorMobile map remains the source of truth.</p>
          </section>
        )}

        <div className="update-row">
          <span><span className="pulse" />{trainingMode ? "Training scenario" : "Last successful sync"}: <strong>{trainingMode ? "Simulated" : data ? `${formatTime(data.retrievedAt)} (${lastSyncAge})` : "Waiting for first verified reading"}</strong></span>
          <span>Source reading: <strong>{trainingMode ? "Simulated—not live" : data?.sourceUpdatedAt ?? "Not available"}</strong></span>
        </div>

        <details className="about-card">
          <summary>About These Readings <span>+</span></summary>
          <div className="about-content">
            <p>This app translates a selected course’s live Thor Guard readings into easier-to-understand language. Live conditions come directly from that course’s ThorMobile system. Interpretations are based on official Thor Guard documentation.</p>
            <nav aria-label="Official sources">
              <ExternalLink href={THOR_URLS.documentation}>Official Thor Guard Documentation</ExternalLink>
              <ExternalLink href={THOR_URLS.education}>How Thor Guard Works</ExternalLink>
              <ExternalLink href={data?.sourcePageUrl ?? sourceUrl}>Live Selected Thor Guard Course</ExternalLink>
            </nav>
          </div>
        </details>

        <footer>
          <p><strong>Safety notice</strong> This application is an informational translator, not an independent lightning-warning system. If this app conflicts with the selected course’s official Thor Guard status, the official status wins.</p>
          <p>This tool simplifies publicly available Thor Guard information. Always follow the official Thor Guard alert, golf course instructions, and local lightning safety procedures.</p>
          <div className="footer-actions">
            <a
              className="footer-action-button"
              href="mailto:savelaven@gmail.com?subject=Thor%20Guard%20Translator%20%E2%80%94%20bug%20or%20enhancement&body=Please%20choose%20one%3A%20Bug%20%2F%20Enhancement%0D%0A%0D%0AWhat%20happened%20or%20what%20would%20you%20like%20changed%3F%0D%0A%0D%0A%0D%0AWhich%20course%20were%20you%20viewing%3F%0D%0A%0D%0A%0D%0AAnything%20else%20that%20would%20help%3F%0D%0A"
            >
              Email the author <span aria-hidden="true">↗</span>
            </a>
            <ExternalLink href="https://github.com/navypa56/thor-guard-translator-golf" className="footer-action-button footer-action-secondary">View on GitHub</ExternalLink>
          </div>
          <p className="author-email-note">Report a bug or suggest an enhancement.</p>
        </footer>
      </div>
    </main>
  );
}
