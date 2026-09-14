import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ForecastResponse {
  minutely_15?: {
    time?: string[];
    precipitation_probability?: Array<number | null>;
    weather_code?: Array<number | null>;
  };
}

function validCoordinate(value: string | null, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export async function GET(request: NextRequest) {
  const latitude = validCoordinate(request.nextUrl.searchParams.get("lat"), -90, 90);
  const longitude = validCoordinate(request.nextUrl.searchParams.get("lon"), -180, 180);
  if (latitude === null || longitude === null) {
    return NextResponse.json({ error: "Valid course coordinates are required." }, { status: 400 });
  }

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", latitude.toString());
    url.searchParams.set("longitude", longitude.toString());
    url.searchParams.set("minutely_15", "precipitation_probability,weather_code");
    url.searchParams.set("forecast_minutely_15", "12");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Forecast service returned HTTP ${response.status}.`);
    const forecast = (await response.json()) as ForecastResponse;
    const probabilities = forecast.minutely_15?.precipitation_probability ?? [];
    const codes = forecast.minutely_15?.weather_code ?? [];
    const max = (values: Array<number | null>) => {
      const available = values.filter((value): value is number => typeof value === "number");
      return available.length ? Math.max(...available) : null;
    };

    return NextResponse.json({
      precipitationChance30: max(probabilities.slice(0, 2)),
      precipitationChance60: max(probabilities.slice(0, 4)),
      precipitationChance3Hours: max(probabilities.slice(0, 12)),
      thunderstormIn3Hours: codes.slice(0, 12).some((code) => typeof code === "number" && code >= 95),
      provider: "Open-Meteo",
      updatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (error) {
    console.error("Unable to retrieve weather outlook:", error);
    return NextResponse.json({ error: "Weather outlook is temporarily unavailable." }, { status: 503 });
  }
}
