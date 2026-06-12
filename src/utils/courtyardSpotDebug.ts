import type { CompanionAvatarViewModel } from '../types/petDashboard';
import { COURTYARD_REST_SPOTS, type CourtyardRestSpot } from './courtyardRestSpots';

/** 本機 dev：網址加 ?pet-spots=1 顯示八點哈士奇測試／編輯畫面 */
export function isCourtyardSpotDebugEnabled(): boolean {
    if (!import.meta.env.DEV) return false;
    return new URLSearchParams(window.location.search).get('pet-spots') === '1';
}

export interface CourtyardSpotDebugEntry {
    spot: CourtyardRestSpot;
    companion: CompanionAvatarViewModel;
}

export function cloneCourtyardRestSpots(): CourtyardRestSpot[] {
    return COURTYARD_REST_SPOTS.map((spot) => ({ ...spot }));
}

export function buildCourtyardSpotDebugEntries(
    spots: CourtyardRestSpot[] = COURTYARD_REST_SPOTS,
): CourtyardSpotDebugEntry[] {
    return spots.map((spot) => ({
        spot,
        companion: {
            id: `debug-spot-${spot.id}`,
            assetType: 'TAIWAN_STOCK',
            family: 'dog',
            companionId: 'husky',
            breedLabel: '哈士奇',
            displayName: spot.label,
            mood: 'neutral',
            color: '#8a9aaa',
            scale: 1,
            allocationPercent: 0,
            marketValueTWD: 0,
            unrealizedPnL: 0,
            pnlCurrency: 'TWD',
            holdingsRoute: '/holdings/taiwan',
            isStray: false,
            isPlaceholder: false,
            companionMessage: `測試點：${spot.label}`,
        },
    }));
}

function roundCoord(value: number): number {
    return Math.round(value * 10) / 10;
}

function roundScale(value: number): number {
    return Math.round(value * 100) / 100;
}

export function formatCourtyardSpotsForExport(spots: CourtyardRestSpot[]): string {
    const lines = spots.map(
        (spot) =>
            `    { id: '${spot.id}', label: '${spot.label}', x: ${roundCoord(spot.x)}, y: ${roundCoord(spot.y)}, scale: ${roundScale(spot.scale)} },`,
    );
    return `export const COURTYARD_REST_SPOTS: CourtyardRestSpot[] = [\n${lines.join('\n')}\n];`;
}

export async function copyCourtyardSpotsToClipboard(spots: CourtyardRestSpot[]): Promise<void> {
    await navigator.clipboard.writeText(formatCourtyardSpotsForExport(spots));
}
