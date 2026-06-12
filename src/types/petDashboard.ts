import type { CourtyardAssetType, AnimalFamily } from '../utils/companionRegistry';

export type CompanionMood = 'happy' | 'neutral' | 'sad' | 'sleepy';

export interface CompanionAvatarViewModel {
    id: string;
    assetType: CourtyardAssetType;
    family: AnimalFamily;
    companionId: string;
    breedLabel: string;
    displayName: string;
    mood: CompanionMood;
    color: string;
    /** 0.7 ~ 1.3，反映該分區內佔比 */
    scale: number;
    allocationPercent: number;
    marketValueTWD: number;
    unrealizedPnL: number;
    pnlCurrency: 'TWD' | 'USD';
    holdingsRoute: string;
    isStray: boolean;
    isPlaceholder: boolean;
    statusLabel?: string;
    poolId?: string;
    /** 漫畫對話框用的陪伴文案 */
    companionMessage: string;
}

export interface CourtyardZoneViewModel {
    assetType: CourtyardAssetType;
    family: AnimalFamily;
    zoneLabel: string;
    companions: CompanionAvatarViewModel[];
}

export interface PetCourtyardViewModel {
    zones: CourtyardZoneViewModel[];
    totalInvestedTWD: number;
    totalUnrealizedPnL: number;
}
