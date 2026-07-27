/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ===== カラートークン（この6色以外は使わない）=====
        base: "#F4EFE5", // 画面背景・生成り
        surface: "#E7DFD0", // カード面・区切り・砂
        ink: "#23201D", // 文字・主要ボタン・墨
        muted: "#6E675C", // 補助テキスト（ink-muted）
        accent: "#D96F4C", // テラコッタ：今・進行中だけ
        highlight: "#F0B429", // マスタード：完了・達成だけ
        // ===== 日ごとの色（伝統色・落ち着いた一族。1日目/2日目…の見分けだけに使う）=====
        // 生成り(#F4EFE5)の文字を載せてコントラスト比4.5以上になる濃さに揃えてある。
        // 実際の割り当ては src/lib/palette.ts の DAY_COLORS を使う。
        ai: "#4A6B8A", // 藍
        matsuba: "#55704F", // 松葉
        ume: "#96536B", // 梅
        kuchiba: "#7D5F36", // 朽葉
        namari: "#4F5D6B", // 鉛
        // ===== 旧トークン名のエイリアス（値は上の6トークンに統一）=====
        kinari: "#F4EFE5", // = base
        "muted-light": "#6E675C", // = muted
        bezel: "#23201D", // = ink
        sheet: "#E7DFD0", // = surface
        mode: {
          air: "#6E675C",
          rail: "#6E675C",
          bus: "#6E675C",
          walk: "#6E675C",
        },
        // ===== ダークテーマ（当日タブ）=====
        // 補助文字は base の不透明度違い（新しい色は足さない）。
        // ink-muted(#6E675C) は暗背景でコントラスト3.2と不足するため使わない。
        day: {
          bg: "#1A1815",
          text: "#F4EFE5",
          text2: "rgba(244,239,229,0.72)",
          text3: "rgba(244,239,229,0.55)",
          nav: "#1A1815",
        },
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
