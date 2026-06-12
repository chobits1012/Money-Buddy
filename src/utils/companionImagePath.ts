import type { CompanionAvatarViewModel } from '../types/petDashboard';

type CompanionImageFields = Pick<
    CompanionAvatarViewModel,
    'family' | 'companionId' | 'mood'
>;

function moodCandidates(mood: CompanionImageFields['mood']): CompanionImageFields['mood'][] {
    if (mood === 'neutral') return ['neutral'];
    return [mood, 'neutral'];
}

/** `{family}-{companionId}-{mood}` under `public/pets/`; webp preferred, png fallback. */
export function getCompanionImageCandidates(
    companion: CompanionImageFields,
): string[] {
    const moods = moodCandidates(companion.mood);
    return moods.flatMap((mood) => {
        const base = `/pets/${companion.family}-${companion.companionId}-${mood}`;
        return [`${base}.webp`, `${base}.png`];
    });
}
