import type { CompanionAvatarViewModel, CompanionMood } from '../types/petDashboard';

type MessageInput = Pick<
    CompanionAvatarViewModel,
    | 'displayName'
    | 'mood'
    | 'isStray'
    | 'isPlaceholder'
    | 'allocationPercent'
    | 'marketValueTWD'
>;

const MOOD_LINES: Record<CompanionMood, string[]> = {
    happy: [
        '這陣子表現不錯，繼續用你習慣的節奏就好。',
        '看起來狀態不錯，記得也給自己一點鼓勵。',
    ],
    neutral: [
        '一切平穩，維持現在的步伐就很好。',
        '沒有大起大落，這也是另一種穩定。',
    ],
    sad: [
        '最近有點悶，市場本來就會起落，不用太緊張。',
        '短期修正很正常，我會在這裡陪你看著。',
    ],
    sleepy: [
        'ZZZ… 正在等最新報價，醒來再跟你說。',
        '先打個盹，報價更新中，稍等一下。',
    ],
};

function pickLine(lines: string[], seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash + seed.charCodeAt(i) * (i + 1)) % lines.length;
    }
    return lines[hash] ?? lines[0];
}

/** 生成陪伴感對話（不提供投資建議） */
export function buildCompanionMessage(input: MessageInput): string {
    const name = input.displayName;

    if (input.isPlaceholder) {
        return `${name}：這裡還空著呢，要不要來建一個軍團？`;
    }

    if (input.isStray) {
        return `${name}：有些持倉還沒找到家，來幫我安排進軍團吧。`;
    }

    if (input.marketValueTWD <= 0) {
        return `${name}：軍團已建立，等你把第一筆持倉送進來。`;
    }

    let line = pickLine(MOOD_LINES[input.mood], `${name}-${input.mood}`);

    if (input.allocationPercent >= 50) {
        line += ' 我在這個分區算是主力夥伴了。';
    }

    return `${name}：${line}`;
}
