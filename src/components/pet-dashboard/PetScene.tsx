import { useMemo, useState } from 'react';
import { PetAvatar } from './PetAvatar';
import { PetAnchoredSpeechBubble } from './PetAnchoredSpeechBubble';
import { PetCourtyardSpotEditor } from './PetCourtyardSpotEditor';
import type { CourtyardZoneViewModel, CompanionAvatarViewModel } from '../../types/petDashboard';
import { COURTYARD_BACKGROUND } from '../../utils/courtyardAssets';
import { assignCourtyardRestSpotsRandom } from '../../utils/courtyardRestSpots';
import { isCourtyardSpotDebugEnabled } from '../../utils/courtyardSpotDebug';

interface PetSceneProps {
    zones: CourtyardZoneViewModel[];
}

interface SelectionState {
    companion: CompanionAvatarViewModel;
    anchorRect: DOMRect;
}

export function PetScene({ zones }: PetSceneProps) {
    const [selection, setSelection] = useState<SelectionState | null>(null);
    const isSpotDebug = isCourtyardSpotDebugEnabled();
    const [shuffleSeed] = useState(() => Math.random());
    const companions = useMemo(
        () => zones.flatMap((zone) => zone.companions),
        [zones],
    );
    const companionIdsKey = companions.map((c) => c.id).sort().join('|');

    const restSpots = useMemo(
        () => assignCourtyardRestSpotsRandom(
            companionIdsKey ? companionIdsKey.split('|') : [],
            shuffleSeed,
        ),
        [companionIdsKey, shuffleSeed],
    );

    const handleSelect = (companion: CompanionAvatarViewModel, anchorRect: DOMRect) => {
        setSelection((prev) =>
            prev?.companion.id === companion.id ? null : { companion, anchorRect },
        );
    };

    if (isSpotDebug) {
        return <PetCourtyardSpotEditor />;
    }

    return (
        <div className="flex flex-col gap-4">
            <section className="pet-courtyard relative overflow-hidden rounded-2xl border border-stoneSoft/50 shadow-sm">
                <div className="relative aspect-[16/9] w-full bg-moss/5">
                    <img
                        src={COURTYARD_BACKGROUND}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        aria-hidden
                    />
                    <div className="absolute inset-0">
                        {companions.map((companion) => {
                            const spot = restSpots.get(companion.id);
                            if (!spot) return null;

                            return (
                                <div
                                    key={companion.id}
                                    className="absolute"
                                    style={{
                                        left: `${spot.x}%`,
                                        top: `${spot.y}%`,
                                        transform: 'translate(-50%, -100%)',
                                        zIndex: Math.round(spot.y),
                                    }}
                                >
                                    <PetAvatar
                                        companion={companion}
                                        variant="courtyard"
                                        courtyardSpotScale={spot.scale}
                                        selected={selection?.companion.id === companion.id}
                                        onSelect={(anchorRect) => handleSelect(companion, anchorRect)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
                <p className="text-[10px] text-clay/80 text-center py-2 bg-white/50 backdrop-blur-[2px]">
                    點擊動物，在頭上對話
                </p>
            </section>

            <PetAnchoredSpeechBubble
                companion={selection?.companion ?? null}
                anchorRect={selection?.anchorRect ?? null}
                onClose={() => setSelection(null)}
            />
        </div>
    );
}
