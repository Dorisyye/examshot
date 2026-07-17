/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 仪表盘深色背景层
        ink: {
          base: "#0a0e14",     // 顶层背景
          surface: "#161b22",  // 卡片
          raised: "#1c2128",   // 抬升元素
          hover: "#21262d",    // 悬停
          border: "#30363d",   // 边框
          subtle: "#21262d",   // 细分隔
        },
        // 文字
        type: {
          primary: "#e6edf3",
          secondary: "#7d8590",
          muted: "#484f58",
        },
        // 状态色
        ok: {
          DEFAULT: "#39d353",   // 完成 电光绿
          soft: "#1a3a23",
          glow: "#39d35333",
        },
        warn: {
          DEFAULT: "#f78166",   // 待办 琥珀橙
          soft: "#3a2418",
        },
        bad: {
          DEFAULT: "#ff6b6b",   // 漏拍 警示红
          soft: "#3a1a1f",
        },
        info: {
          DEFAULT: "#58a6ff",   // 中性/进行中 青蓝
          soft: "#11203a",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ['"Sora"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.9rem" }],
      },
      letterSpacing: {
        wide2: "0.12em",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(57, 211, 83, 0.4), 0 0 20px rgba(57, 211, 83, 0.25)",
        glowbad: "0 0 0 1px rgba(255, 107, 107, 0.4), 0 0 20px rgba(255, 107, 107, 0.25)",
        card: "0 1px 0 rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.35)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) 2",
        "slide-up": "slideUp 0.25s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "flash-ok": "flashOk 0.6s ease-out",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        flashOk: {
          "0%": { backgroundColor: "rgba(57, 211, 83, 0.4)" },
          "100%": { backgroundColor: "transparent" },
        },
      },
    },
  },
  plugins: [],
};
