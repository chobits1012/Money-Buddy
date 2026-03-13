import type { Config } from 'tailwindcss'

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Japanese Zen Dark Mode Colors
                background: '#121212',
                surface: '#1E1E1E',
                surfaceHighlight: '#2C2C2C',
                textPrimary: '#E0E0E0',
                textSecondary: '#A0A0A0',
                accentPrimary: '#4A90E2', // 穩重的藍色
                accentSuccess: '#4CAF50', // 增長的綠色
                accentWarning: '#FFC107', // 基金/證券的黃橘色
                accentDanger: '#E53935',  // 警示或虧損紅色

                // Asset specific colors
                assetTaiwan: '#4A90E2', // 台股
                assetUS: '#9C27B0',     // 美股
                assetBonds: '#FF9800',  // 證券
                assetFunds: '#00BCD4',  // 基金
                assetIdle: '#383838',   // 閒置資金
            },
            fontFamily: {
                sans: ['"Noto Sans TC"', '"Inter"', 'sans-serif'],
            }
        },
    },
    plugins: [],
} satisfies Config
