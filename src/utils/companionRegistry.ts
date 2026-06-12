import type { AssetType } from '../types';

/** 庭院目前支援的資產類型（未來 CRYPTO 等可擴充為鳥、魚） */
export type CourtyardAssetType = Extract<AssetType, 'TAIWAN_STOCK' | 'US_STOCK' | 'FUNDS'>;

export type AnimalFamily = 'dog' | 'cat' | 'pig';

export interface CompanionBreedDefinition {
    id: string;
    label: string;
    color: string;
}

export interface AnimalFamilyDefinition {
    family: AnimalFamily;
    zoneLabel: string;
    assetType: CourtyardAssetType;
    defaultBreedId: string;
    strayBreedId: string;
    strayLabel: string;
    placeholderLabel: string;
    breeds: CompanionBreedDefinition[];
}

export const COURTYARD_ASSET_TYPES: CourtyardAssetType[] = ['TAIWAN_STOCK', 'US_STOCK', 'FUNDS'];

const STRAY_BREEDS: Record<CourtyardAssetType, CompanionBreedDefinition> = {
    TAIWAN_STOCK: { id: 'stray-dog', label: '流浪犬', color: '#b8a88a' },
    US_STOCK: { id: 'stray-cat', label: '流浪貓', color: '#a89e94' },
    FUNDS: { id: 'stray-pig', label: '流浪豬', color: '#d4b8b8' },
};

export const ANIMAL_FAMILIES: Record<CourtyardAssetType, AnimalFamilyDefinition> = {
    TAIWAN_STOCK: {
        family: 'dog',
        zoneLabel: '狗區 · 台股',
        assetType: 'TAIWAN_STOCK',
        defaultBreedId: 'shiba',
        strayBreedId: STRAY_BREEDS.TAIWAN_STOCK.id,
        strayLabel: STRAY_BREEDS.TAIWAN_STOCK.label,
        placeholderLabel: '尚未建立軍團',
        breeds: [
            { id: 'shiba', label: '柴犬', color: '#c4a574' },
            { id: 'corgi', label: '柯基', color: '#d4956a' },
            { id: 'golden-dog', label: '黃金獵犬', color: '#d4a55a' },
            { id: 'husky', label: '哈士奇', color: '#8a9aaa' },
        ],
    },
    US_STOCK: {
        family: 'cat',
        zoneLabel: '貓區 · 美股',
        assetType: 'US_STOCK',
        defaultBreedId: 'orange-cat',
        strayBreedId: STRAY_BREEDS.US_STOCK.id,
        strayLabel: STRAY_BREEDS.US_STOCK.label,
        placeholderLabel: '尚未建立軍團',
        breeds: [
            { id: 'orange-cat', label: '橘貓', color: '#e8a054' },
            { id: 'black-cat', label: '黑貓', color: '#5a5a5a' },
            { id: 'siamese', label: '暹羅貓', color: '#c9b896' },
            { id: 'british', label: '英國短毛貓', color: '#9a9a9a' },
        ],
    },
    FUNDS: {
        family: 'pig',
        zoneLabel: '豬區 · 基金',
        assetType: 'FUNDS',
        defaultBreedId: 'mini-pig',
        strayBreedId: STRAY_BREEDS.FUNDS.id,
        strayLabel: STRAY_BREEDS.FUNDS.label,
        placeholderLabel: '尚未建立軍團',
        breeds: [
            { id: 'mini-pig', label: '迷你豬', color: '#f0c4c4' },
            { id: 'spot-pig', label: '花斑豬', color: '#e8b4b4' },
            { id: 'pink-pig', label: '粉紅豬', color: '#f5d0d0' },
        ],
    },
};

export function getDefaultCompanionId(assetType: CourtyardAssetType): string {
    return ANIMAL_FAMILIES[assetType].defaultBreedId;
}

export function resolveCompanionBreed(
    assetType: CourtyardAssetType,
    companionId?: string,
): CompanionBreedDefinition {
    const family = ANIMAL_FAMILIES[assetType];
    if (companionId === family.strayBreedId) {
        return STRAY_BREEDS[assetType];
    }
    const breed = family.breeds.find((b) => b.id === companionId);
    if (breed) return breed;
    return family.breeds.find((b) => b.id === family.defaultBreedId) ?? family.breeds[0];
}

export function listSelectableBreeds(assetType: CourtyardAssetType): CompanionBreedDefinition[] {
    return ANIMAL_FAMILIES[assetType].breeds;
}

export function isValidCompanionId(assetType: CourtyardAssetType, companionId: string): boolean {
    return ANIMAL_FAMILIES[assetType].breeds.some((b) => b.id === companionId);
}
