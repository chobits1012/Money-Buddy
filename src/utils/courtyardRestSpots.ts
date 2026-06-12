/**
 * 庭院休息點（% 座標相對於 16:9 場景圖）。
 * scale 1.0 = 最靠近鏡頭（目前最大尺寸）；愈遠愈小。
 */
export interface CourtyardRestSpot {
    id: string;
    /** 說明用，不顯示在 UI */
    label: string;
    /** 水平位置 0–100 */
    x: number;
    /** 垂直位置 0–100（愈大愈靠近前景） */
    y: number;
    scale: number;
}

/** scale 1.0 僅限 deck-cushion（最前景左下坐墊），其餘皆更小 */
export const COURTYARD_REST_SPOTS: CourtyardRestSpot[] = [
    { id: 'deck-cushion', label: '木平台 · 前景坐墊', x: 15, y: 98.5, scale: 1 },
    { id: 'lawn-mid', label: '踏腳石旁草地', x: 42.4, y: 73, scale: 0.8 },
    { id: 'deck-planter', label: '右側木台 · 花盆', x: 92.8, y: 42.8, scale: 0.97 },
    { id: 'deck-lantern', label: '前景右下 · 燈籠旁', x: 73.4, y: 96, scale: 0.87 },
    { id: 'lawn-back', label: '後方草地', x: 57.8, y: 33.7, scale: 0.54 },
    { id: 'picnic', label: '野餐墊', x: 75, y: 50, scale: 0.64 },
    { id: 'pond-bridge', label: '池塘 · 木橋', x: 4.6, y: 63.5, scale: 0.6 },
    { id: 'swing-seat', label: '鞦韆座椅上', x: 20.7, y: 32.3, scale: 0.44 },
];

function hashCompanionId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) {
        hash = (hash * 31 + id.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

function shuffleSpotIndices(random: () => number): number[] {
    const indices = COURTYARD_REST_SPOTS.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [indices[i], indices[j]] = [indices[j]!, indices[i]!];
    }
    return indices;
}

/** 穩定分配休息點；同頁面內 companionId 不變則位置不變 */
export function assignCourtyardRestSpots(companionIds: string[]): Map<string, CourtyardRestSpot> {
    const sortedIds = [...companionIds].sort();
    const usedSpotIndices = new Set<number>();
    const assignments = new Map<string, CourtyardRestSpot>();

    for (const id of sortedIds) {
        let index = hashCompanionId(id) % COURTYARD_REST_SPOTS.length;
        let probe = 0;
        while (usedSpotIndices.has(index) && probe < COURTYARD_REST_SPOTS.length) {
            index = (index + 1) % COURTYARD_REST_SPOTS.length;
            probe += 1;
        }
        usedSpotIndices.add(index);
        assignments.set(id, COURTYARD_REST_SPOTS[index]!);
    }

    return assignments;
}

function createSeededRandom(seed: number): () => number {
    let state = Math.floor(seed * 1_000_000) % 2_147_483_647 || 1;
    return () => {
        state = (state * 16_807) % 2_147_483_647;
        return (state - 1) / 2_147_483_646;
    };
}

/** 每次呼叫隨機打亂休息點（用於重整頁面後換位） */
export function assignCourtyardRestSpotsRandom(
    companionIds: string[],
    seed: number = Math.random(),
): Map<string, CourtyardRestSpot> {
    const shuffledIndices = shuffleSpotIndices(createSeededRandom(seed));
    const sortedIds = [...companionIds].sort();
    const assignments = new Map<string, CourtyardRestSpot>();

    sortedIds.forEach((id, index) => {
        const spotIndex = shuffledIndices[index % shuffledIndices.length]!;
        assignments.set(id, COURTYARD_REST_SPOTS[spotIndex]!);
    });

    return assignments;
}
