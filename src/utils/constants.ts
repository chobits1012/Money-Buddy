// 常數集中管理 (遵循 clean-code 規範)
import type { AssetType } from '../types';

export const DEFAULT_USD_RATE = 31.5;

export const ASSET_LABELS: Record<AssetType, string> = {
    TAIWAN_STOCK: '台股',
    US_STOCK: '美股',
    FUNDS: '基金',
    CRYPTO: '虛擬幣',
};

// 用於 Tailwind CSS class 組裝的安全常數 — Wabi-Sabi 大地色系
export const ASSET_COLORS: Record<AssetType, string> = {
    TAIWAN_STOCK: 'text-moss bg-moss/10',
    US_STOCK: 'text-rust bg-rust/10',
    FUNDS: 'text-clay bg-clay/10',
    CRYPTO: 'text-primary bg-primary/10',
};

// Dashboard 按鈕圓點色 (Tailwind class)
export const ASSET_DOT_COLORS: Record<AssetType, string> = {
    TAIWAN_STOCK: 'bg-moss',
    US_STOCK: 'bg-rust',
    FUNDS: 'bg-clay',
    CRYPTO: 'bg-primary',
};

// Recharts 圓餅圖用的 hex 色
export const ASSET_CHART_COLORS: Record<AssetType | 'AVAILABLE', string> = {
    TAIWAN_STOCK: '#7a8266',  // moss
    US_STOCK: '#b46b4d',      // rust
    FUNDS: '#a89e94',         // clay
    CRYPTO: '#ec5b13',        // primary
    AVAILABLE: '#e5e1dc',     // stoneSoft
};

// 自訂欄位用的色盤 — 輪播使用
export const CUSTOM_CATEGORY_COLORS = [
    '#6b8e7b',  // sage green
    '#b0856e',  // warm sienna
    '#8b7ea6',  // muted purple
    '#c4956a',  // golden brown
    '#5e8c9e',  // slate teal
    '#d4a574',  // sandy
    '#7b9e89',  // eucalyptus
];

export const FORMAT_TWD = new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
});

export const FORMAT_USD = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
});
