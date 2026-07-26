import { guardRequest } from "@/lib/apiGuard";
import { WeatherInfo, weatherCodeToJa } from "@/lib/weather";

/**
 * 当日の天気を取得する（Open-Meteo・APIキー不要）。
 * 緯度経度から直近の降水確率・気温・天気コードを読み、屋内/屋外提案の出し分けに使う。
 */
export async function POST(request: Request): Promise<Response> {
  const denied = guardRequest(request, 30);
  if (denied) return denied;

  let payload: { lat?: number; lng?: number };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const { lat, lng } = payload;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return Response.json({ error: "lat / lng が必要です" }, { status: 400 });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("longitude", lng.toFixed(4));
  url.searchParams.set("current", "temperature_2m,weather_code,precipitation");
  url.searchParams.set("hourly", "precipitation_probability");
  url.searchParams.set("timezone", "Asia/Tokyo");
  url.searchParams.set("forecast_days", "1");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);
    const data = await res.json();

    const code = data?.current?.weather_code ?? 3;
    const temperature = typeof data?.current?.temperature_2m === "number" ? data.current.temperature_2m : null;
    const currentPrecip = typeof data?.current?.precipitation === "number" ? data.current.precipitation : 0;

    // 直近3時間の最大降水確率を採用
    const probs: number[] = Array.isArray(data?.hourly?.precipitation_probability)
      ? data.hourly.precipitation_probability.slice(0, 3).filter((n: unknown): n is number => typeof n === "number")
      : [];
    const precipitationProbability = probs.length ? Math.max(...probs) : 0;

    const { summary, rainy } = weatherCodeToJa(code);
    const rain = rainy || currentPrecip > 0 || precipitationProbability >= 50;

    const info: WeatherInfo = { rain, precipitationProbability, temperature, summary };
    return Response.json(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return Response.json({ error: `天気の取得に失敗しました: ${message}` }, { status: 502 });
  }
}
