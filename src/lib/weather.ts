/** 当日の天気サマリ。屋内/屋外スポットの出し分けに使う。 */
export interface WeatherInfo {
  /** 直近数時間に雨が想定されるか */
  rain: boolean;
  /** 降水確率（%） */
  precipitationProbability: number;
  /** 気温（℃） */
  temperature: number | null;
  /** 短い日本語サマリ（例: 「雨のち曇り」相当の一言） */
  summary: string;
}

/** WMO weather code → 日本語のざっくりラベル。 */
export function weatherCodeToJa(code: number): { summary: string; rainy: boolean } {
  if (code === 0) return { summary: "快晴", rainy: false };
  if (code <= 2) return { summary: "晴れ時々曇り", rainy: false };
  if (code === 3) return { summary: "曇り", rainy: false };
  if (code <= 48) return { summary: "霧", rainy: false };
  if (code <= 57) return { summary: "霧雨", rainy: true };
  if (code <= 67) return { summary: "雨", rainy: true };
  if (code <= 77) return { summary: "雪", rainy: true };
  if (code <= 82) return { summary: "にわか雨", rainy: true };
  if (code <= 86) return { summary: "にわか雪", rainy: true };
  return { summary: "雷雨", rainy: true };
}
