"use client";

import { useEffect, useRef, useState } from "react";

export function ThorRadarMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!mapElement.current) return;
    let cancelled = false;
    let map: import("leaflet").Map | undefined;

    async function initialize() {
      try {
        const [leafletModule, radarResponse] = await Promise.all([
          import("leaflet"),
          fetch("/api/radar", { cache: "no-store" }),
        ]);
        if (!radarResponse.ok) throw new Error("Radar unavailable");
        const radar = await radarResponse.json() as { host: string; path: string };
        if (cancelled || !mapElement.current) return;
        const L = leafletModule.default;
        map = L.map(mapElement.current, { zoomControl: true, attributionControl: true }).setView([latitude, longitude], 7);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: "© OpenStreetMap",
        }).addTo(map);
        L.tileLayer(`${radar.host}${radar.path}/256/{z}/{x}/{y}/2/1_1.png`, {
          opacity: 0.72,
          maxNativeZoom: 7,
          attribution: "Radar: RainViewer",
        }).addTo(map);
        L.circleMarker([latitude, longitude], {
          radius: 7,
          color: "#ffffff",
          weight: 3,
          fillColor: "#111714",
          fillOpacity: 1,
        }).addTo(map).bindTooltip("Thor Guard course", { permanent: false });
      } catch {
        if (!cancelled) setUnavailable(true);
      }
    }

    initialize();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [latitude, longitude]);

  if (unavailable) return <div className="map-unavailable">Live radar is temporarily unavailable.</div>;
  return <div ref={mapElement} className="radar-map" aria-label="Live radar map centered on the selected Thor Guard course" />;
}
