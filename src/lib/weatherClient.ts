import { apiUrl } from "./apiBase";
import { GeoPoint } from "./types";
import { WeatherInfo } from "./weather";

/** 当日の天気を取得する（/api/weather 経由）。失敗時は null。 */
export async function fetchWeather(geo: GeoPoint): Promise<WeatherInfo | null> {
  try {
    const res = await fetch(apiUrl("/api/weather"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat: geo.lat, lng: geo.lng }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error) return null;
    return data as WeatherInfo;
  } catch {
    return null;
  }
}
