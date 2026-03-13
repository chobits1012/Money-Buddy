// 常數集中管理 (遵循 clean-code 規範)
import type { AssetType } from '../types';

export const DEFAULT_USD_RATE = 31.5;

export const ASSET_LABELS: Record<AssetType, string> = {
    TAIWAN_STOCK: '台股',
    US_STOCK: '美股',
    BONDS: '證券',
    FUNDS: '基金',
};

// 用於 Tailwind CSS class 組裝的安全常數
export const ASSET_COLORS: Record<AssetType, string> = {
    TAIWAN_STOCK: 'text-[#4A90E2] bg-[#4A90E2]/10',
    US_STOCK: 'text-[#9C27B0] bg-[#9C27B0]/10',
    BONDS: 'text-[#FF9800] bg-[#FF9800]/10',
    FUNDS: 'text-[#00BCD4] bg-[#00BCD4]/10',
};

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
