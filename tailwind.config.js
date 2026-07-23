/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        kinari: "#f3efe6",
        ink: "#2a2622",
        muted: "#8a8378",
        "muted-light": "#b7b0a3",
        bezel: "#1c1915",
        mode: {
          air: "#4d5b7c",
          rail: "#4f7a5b",
          bus: "#a8804a",
          walk: "#9a9384",
        },
        accent: "#c2492d",
        day: {
          bg: "#24201b",
          text: "#ece5d7",
          text2: "#8f8674",
          text3: "#6b6459",
          nav: "#1f1b16",
        },
        sheet: "#efe9dd",
      },
      fontFamily: {
        // ウェイトごとに読み込んだ実フォントを割り当てる（React Nativeはウェイト合成非対応のため）
        "mincho-400": ["ZenOldMincho_400Regular"],
        "mincho-600": ["ZenOldMincho_600SemiBold"],
        "mincho-700": ["ZenOldMincho_700Bold"],
        "mincho-900": ["ZenOldMincho_900Black"],
        "gothic-400": ["NotoSansJP_400Regular"],
        "gothic-500": ["NotoSansJP_500Medium"],
        "gothic-700": ["NotoSansJP_700Bold"],
      },
      borderRadius: {
        device: "44px",
        screen: "34px",
        sheet: "22px",
      },
    },
  },
  plugins: [],
};
