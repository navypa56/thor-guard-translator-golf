"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_THOR_PAGE_URL, READING_DEFINITIONS, THOR_URLS, type ReadingKey } from "@/lib/thorDefinitions";
import { interpretThor, unavailableInterpretation } from "@/lib/interpretThor";
import type { ThorData } from "@/lib/thorParser";
import { ThorRadarMap } from "@/components/ThorRadarMap";
import { waitingEstimate, type WeatherOutlook } from "@/lib/weatherOutlook";

const readingKeys: ReadingKey[] = ["lhl", "di", "ad", "fcc"];

const insights: Array<{
  key: ReadingKey;
  icon: string;
  title: string;
  explanation: (view: ReturnType<typeof interpretThor>) => string;
}> = [
  { key: "lhl", icon: "ϟ", title: "Immediate electrical activity", explanation: (view) => view.activityExplanation },
  { key: "di", icon: "↗", title: "Storm trend", explanation: (view) => view.trend },
  { key: "ad", icon: "◎", title: "All-clear progress", explanation: (view) => view.allClearExplanation },
  { key: "fcc", icon: "⌁", title: "Electrical discharges", explanation: (view) => view.dischargeExplanation },
];

function ExternalLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return <a className={className} href={href} target="_blank" rel="noreferrer">{children}<span aria-hidden="true"> ↗</span></a>;
}

function formatTime(value?: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

export function ThorDashboard() {
  const [data, setData] = useState<ThorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sourceUrl, setSourceUrl] = useState<string>(DEFAULT_THOR_PAGE_URL);
  const [draftUrl, setDraftUrl] = useState<string>(DEFAULT_THOR_PAGE_URL);
  const [sourceReady, setSourceReady] = useState(false);
  const [secondsToRefresh, setSecondsToRefresh] = useState(10);
  const [nextRefreshAt, setNextRefreshAt] = useState(() => Date.now() + 10_000);
  const [outlook, setOutlook] = useState<WeatherOutlook | null>(null);

  useEffect(() => {
    const initialize = window.setTimeout(() => {
      const saved = window.localStorage.getItem("thor-course-url") ?? DEFAULT_THOR_PAGE_URL;
      setSourceUrl(saved);
      setDraftUrl(saved);
      setSourceReady(true);
    }, 0);
    return () => window.clearTimeout(initialize);
  }, []);

  const refresh = useCallback(async () => {
    if (!sourceReady) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/thor?source=${encodeURIComponent(sourceUrl)}`, { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Live data unavailable");
      }
      setData(await response.json());
      setFailed(false);
      setErrorMessage("");
    } catch (error) {
      setData(null);
      setFailed(true);
      setErrorMessage(error instanceof Error ? error.message : "Live data unavailable");
    } finally {
      setNextRefreshAt(Date.now() + 10_000);
      setLoading(false);
    }
  }, [sourceReady, sourceUrl]);

  useEffect(() => {
    if (!sourceReady) return;
    const initial = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 10_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refresh, sourceReady]);

  useEffect(() => {
    const timer = window.setInterval(() => {
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
    setSourceUrl(value);
  }

  function restoreDefault() {
    window.localStorage.removeItem("thor-course-url");
    setDraftUrl(DEFAULT_THOR_PAGE_URL);
    setSourceUrl(DEFAULT_THOR_PAGE_URL);
  }

  const view = data ? interpretThor(data) : unavailableInterpretation();
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
          <div className={`live-pill ${failed ? "offline" : ""}`}>
            <span className="live-dot" />{loading ? "CHECKING" : failed ? "UNAVAILABLE" : "LIVE"}
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
          <p className="status-summary">{loading ? "Checking the selected course’s official Thor Guard source…" : view.summary}</p>
          <div className="status-meta">
            <span>{data?.location ?? "Selected course"}</span>
            <span>Official status: <strong>{data?.officialStatus ?? "Not verified"}</strong></span>
          </div>
        </section>

        {failed && (
          <div className="source-error"><p>{errorMessage}</p><ExternalLink href={sourceUrl} className="official-button">Open Selected Thor Guard Page</ExternalLink></div>
        )}

        <section className={`section-block alert-surface alert-${view.tone}`}>
          <div className="section-heading">
            <div><p className="section-number">01 / LIVE TRANSLATION</p><h2>What’s happening right now</h2></div>
            <div className="refresh-cluster"><span>Refresh in {secondsToRefresh}s</span><button className="refresh-button" onClick={refresh} disabled={loading} aria-label="Refresh live data">↻</button></div>
          </div>
          <div className="insight-grid">
            {insights.map((insight) => (
              <article key={insight.key}>
                <span className="insight-icon" aria-hidden="true">{insight.icon}</span>
                <div className="insight-copy">
                  <div className="insight-title-row">
                    <h3>{insight.title}</h3>
                    <span className="reading-chip"><b>{READING_DEFINITIONS[insight.key].label}</b> {data?.[insight.key] ?? "—"}</span>
                  </div>
                  <p>{insight.explanation(view)}</p>
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
                <div className="reading-value">{data?.[key] ?? "—"}</div>
              </div>
            ))}
          </div>
          <p className="verification-note">Definitions are deliberately conservative until each abbreviation is verified against current official documentation.</p>
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

        {data?.latitude !== null && data?.longitude !== null && data?.latitude !== undefined && data?.longitude !== undefined && (
          <section className="map-card">
            <div className="map-heading"><div><p className="section-number">LIVE RADAR</p><h2>Course map</h2></div><ExternalLink href={data.sourcePageUrl ?? sourceUrl}>Open official Thor map</ExternalLink></div>
            <ThorRadarMap latitude={data.latitude} longitude={data.longitude} />
            <div className="radar-legend" aria-label="Weather radar color guide">
              <div className="legend-title"><strong>Radar color guide</strong><span>Rain intensity</span></div>
              <div className="legend-scale" aria-hidden="true" />
              <div className="legend-labels"><span>Light</span><span>Moderate</span><span>Heavy</span><span>Very heavy</span></div>
            </div>
            <p className="map-credit">Radar overlay by <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>. The official ThorMobile map remains the source of truth.</p>
          </section>
        )}

        <div className="update-row">
          <span><span className="pulse" />Last successful update: <strong>{formatTime(data?.retrievedAt)}</strong></span>
          <span>Source reading: <strong>{data?.sourceUpdatedAt ?? "Not available"}</strong></span>
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
        </footer>
      </div>
    </main>
  );
}
