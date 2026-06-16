import { useMemo, useRef, useState } from 'react';
import { CourtyardPetAtSpot } from './CourtyardPetAtSpot';
import { PetAnchoredSpeechBubble } from './PetAnchoredSpeechBubble';
import { PetCourtyardSpotEditor } from './PetCourtyardSpotEditor';
import type { CourtyardZoneViewModel, CompanionAvatarViewModel } from '../../types/petDashboard';
import { CourtyardSceneCanvas } from './CourtyardSceneCanvas';
import {
    assignCourtyardRestSpotsRandom,
    getCourtyardRestSpotsLayoutKey,
} from '../../utils/courtyardRestSpots';
import { isCourtyardSpotDebugEnabled, shouldShowCourtyardSpotLabels } from '../../utils/courtyardSpotDebug';

interface PetSceneProps {
    zones: CourtyardZoneViewModel[];
    presentation?: 'card' | 'fullscreen';
}

interface SelectionState {
    companion: CompanionAvatarViewModel;
    anchorRect: DOMRect;
}

export function PetScene({ zones, presentation = 'card' }: PetSceneProps) {
    const sceneRef = useRef<HTMLElement>(null);
    const [selection, setSelection] = useState<SelectionState | null>(null);
    const isSpotDebug = isCourtyardSpotDebugEnabled();
    const companions = useMemo(
        () => zones.flatMap((zone) => zone.companions),
        [zones],
    );
    const companionIds = useMemo(
        () => companions.map((c) => c.id).sort(),
        [companions],
    );
    const spotsLayoutKey = getCourtyardRestSpotsLayoutKey();
    const sessionRandomSeed = useMemo(() => Math.random(), []);

    const restSpots = useMemo(
        () => assignCourtyardRestSpotsRandom(companionIds, sessionRandomSeed),
        [companionIds, sessionRandomSeed, spotsLayoutKey],
    );

    const handleSelect = (companion: CompanionAvatarViewModel, anchorRect: DOMRect) => {
        setSelection((prev) =>
            prev?.companion.id === companion.id ? null : { companion, anchorRect },
        );
    };

    if (isSpotDebug) {
        return <PetCourtyardSpotEditor />;
    }

    const showSpotLabels = shouldShowCourtyardSpotLabels();

    const isFullscreen = presentation === 'fullscreen';

    return (
        <div className="flex flex-col gap-4">
            <section
                ref={sceneRef}
                className={
                    isFullscreen
                        ? 'pet-courtyard relative overflow-hidden rounded-none border-0 shadow-none h-full w-full'
                        : 'pet-courtyard relative overflow-hidden rounded-2xl border border-stoneSoft/50 shadow-sm'
                }
            >
                <CourtyardSceneCanvas>
                    {companions.map((companion) => {
                        const spot = restSpots.get(companion.id);
                        if (!spot) return null;

                        return (
                            <CourtyardPetAtSpot
                                key={`${companion.id}-${spot.id}-${spotsLayoutKey}`}
                                spot={spot}
                                companion={companion}
                                showSpotLabel={showSpotLabels}
                                onSelect={(anchorRect) => handleSelect(companion, anchorRect)}
                            />
                        );
                    })}
                </CourtyardSceneCanvas>
                {!isFullscreen && (
                    <p className="text-[10px] text-clay/80 text-center py-2 bg-white/50 backdrop-blur-[2px]">
                        點擊動物，在頭上對話
                    </p>
                )}
            </section>

            <PetAnchoredSpeechBubble
                companion={selection?.companion ?? null}
                anchorRect={selection?.anchorRect ?? null}
                positioningRoot={isFullscreen ? sceneRef.current : null}
                onClose={() => setSelection(null)}
            />
        </div>
    );
}
