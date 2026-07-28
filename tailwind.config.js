/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ===== カラートークン（この6色以外は使わない）=====
        // 値はブランドイラスト（フラットベクター／太い黒線／コーラルピンク地）から
        // そのまま抜いた4色を土台にしている。イラストとUIが同じ絵の具で描かれて見えるようにするため。
        //   コーラル #F69B96 ／ ローズ #DD5967 ／ クリーム #F5EAD6 ／ 墨 #1A1A1A
        base: "#F5EAD6", // 画面背景・クリーム（イラストの生成り面と同じ）
        surface: "#EFDFC5", // カード面・区切り・砂（base をひと段濃くしただけ）
        ink: "#1A1A1A", // 文字・主要ボタン・墨（イラストの輪郭線と同じ）
        muted: "#6F625A", // 補助テキスト（ink-muted）
        accent: "#DD5967", // ローズレッド：今・進行中だけ
        highlight: "#F69B96", // コーラルピンク：完了・達成、そしてイラストの下地
        // ===== 日ごとの色（伝統色・落ち着いた一族。1日目/2日目…の見分けだけに使う）=====
        // クリーム(#F5EAD6)の文字を載せてコントラスト比4.5以上になる濃さに揃えてある。
        // ローズ/コーラルと同じ「くすんだ深さ」に彩度をそろえ、並べても散らからないようにした。
        // 実際の割り当ては src/lib/palette.ts の DAY_COLORS を使う。
        kobai: "#A8465F", // 紅梅
        kuchiba: "#8A5A3C", // 朽葉
        fuji: "#6E5A7A", // 藤
        sabiasagi: "#4F6B6B", // 錆浅葱
        namari: "#55657F", // 鈍藍
        // ===== 旧トークン名のエイリアス（値は上の6トークンに統一）=====
        kinari: "#F5EAD6", // = base
        "muted-light": "#6F625A", // = muted
        bezel: "#1A1A1A", // = ink
        sheet: "#EFDFC5", // = surface
        mode: {
          air: "#6F625A",
          rail: "#6F625A",
          bus: "#6F625A",
          walk: "#6F625A",
        },
        // ===== ダークテーマ（当日タブ）=====
        // 補助文字は base の不透明度違い（新しい色は足さない）。
        // ink-muted(#6F625A) は暗背景でコントラスト3.2と不足するため使わない。
        day: {
          bg: "#171412",
          text: "#F5EAD6",
          text2: "rgba(245,234,214,0.72)",
          text3: "rgba(245,234,214,0.55)",
          nav: "#171412",
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
