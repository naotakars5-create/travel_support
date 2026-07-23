import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 地（計画モード）
        kinari: "#f3efe6",
        // インク（主テキスト）
        ink: "#2a2622",
        // ミュート（副テキスト）
        muted: "#8a8378",
        // ミュート薄（無効/通過済）
        "muted-light": "#b7b0a3",
        // 端末ベゼル
        bezel: "#1c1915",
        // 移動手段
        mode: {
          air: "#4d5b7c",
          rail: "#4f7a5b",
          bus: "#a8804a",
          walk: "#9a9384",
        },
        // 強調（朱）— 当日カウントダウン限定
        accent: "#c2492d",
        // 当日モード
        day: {
          bg: "#24201b",
          text: "#ece5d7",
          text2: "#8f8674",
          text3: "#6b6459",
          nav: "#1f1b16",
        },
        // 受信箱シート地
        sheet: "#efe9dd",
      },
      fontFamily: {
        mincho: ["var(--font-mincho)", "Hiragino Mincho ProN", "serif"],
        gothic: ["var(--font-gothic)", "Hiragino Kaku Gothic ProN", "sans-serif"],
      },
      fontSize: {
        countdown: ["90px", { lineHeight: "0.9", fontWeight: "900" }],
        "free-large": ["62px", { lineHeight: "0.9", fontWeight: "900" }],
        "screen-heading": ["26px", { lineHeight: "1.2", fontWeight: "600" }],
        "next-event": ["23px", { lineHeight: "1.3", fontWeight: "600" }],
        "node-title": ["15px", { lineHeight: "1.3", fontWeight: "600" }],
        "rail-time": ["15px", { lineHeight: "1.2", fontWeight: "600" }],
        sender: ["14px", { lineHeight: "1.3", fontWeight: "600" }],
      },
      borderRadius: {
        device: "44px",
        screen: "34px",
        sheet: "22px",
      },
      spacing: {
        "device-w": "384px",
        "device-h": "788px",
        "device-pad": "11px",
        "nav-h": "66px",
      },
      gridTemplateColumns: {
        rail: "48px 26px 1fr",
      },
      keyframes: {
        sheetup: {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        spin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        pulse: {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "70%": { transform: "scale(2.2)", opacity: "0" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        flashfade: {
          "0%": { opacity: "0" },
          "12%": { opacity: "1" },
          "82%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        nodein: {
          from: { opacity: "0", transform: "translateY(-6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        sheetup: "sheetup .34s cubic-bezier(.22,.61,.36,1)",
        spin: "spin .9s linear infinite",
        pulse: "pulse 1.4s cubic-bezier(0,0,.2,1) infinite",
        blink: "blink 1.1s steps(1) infinite",
        flashfade: "flashfade 1.7s ease forwards",
        nodein: "nodein .5s cubic-bezier(.22,.61,.36,1)",
      },
    },
  },
  plugins: [],
};

export default config;
