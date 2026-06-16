import { useMemo, useState } from 'react';
import type { CompanionAvatarViewModel } from '../../types/petDashboard';
import { getCompanionImageCandidates } from '../../utils/companionImagePath';

export type CompanionSilhouetteSize = 'default' | 'courtyard';

interface CompanionSilhouetteProps {
    companion: Pick<
        CompanionAvatarViewModel,
        'family' | 'companionId' | 'mood' | 'color' | 'isPlaceholder'
    >;
    size?: CompanionSilhouetteSize;
    /** 庭院遠近縮放；用實際尺寸而非 transform，避免邊角被裁切 */
    scale?: number;
}

const MOOD_EYE: Record<CompanionAvatarViewModel['mood'], string> = {
    happy: '◠',
    neutral: '−',
    sad: '⌢',
    sleepy: '～',
};

const IMAGE_SIZES: Record<CompanionSilhouetteSize, { width: number; height: number }> = {
    default: { width: 96, height: 80 },
    courtyard: { width: 56, height: 48 },
};

export function CompanionSilhouette({
    companion,
    size = 'default',
    scale = 1,
}: CompanionSilhouetteProps) {
    const baseSize = IMAGE_SIZES[size];
    const imageSize = {
        width: baseSize.width * scale,
        height: baseSize.height * scale,
    };
    const candidates = useMemo(
        () => getCompanionImageCandidates(companion),
        [companion.family, companion.companionId, companion.mood],
    );
    const [candidateIndex, setCandidateIndex] = useState(0);

    if (!companion.isPlaceholder && candidateIndex < candidates.length) {
        const img = (
            <img
                src={candidates[candidateIndex]}
                alt=""
                width={imageSize.width}
                height={imageSize.height}
                className="block max-h-full max-w-full object-contain object-bottom drop-shadow-sm"
                aria-hidden
                onError={() => setCandidateIndex((index) => index + 1)}
            />
        );

        if (size === 'courtyard') {
            return (
                <div
                    className="flex items-end justify-center"
                    style={{ width: imageSize.width, height: imageSize.height }}
                >
                    {img}
                </div>
            );
        }

        return img;
    }

    return <CompanionSilhouetteSvg companion={companion} size={size} scale={scale} />;
}

function CompanionSilhouetteSvg({
    companion,
    size = 'default',
    scale = 1,
}: {
    companion: Pick<CompanionAvatarViewModel, 'family' | 'companionId' | 'mood' | 'color'>;
    size?: CompanionSilhouetteSize;
    scale?: number;
}) {
    const baseSize = IMAGE_SIZES[size];
    const imageSize = {
        width: baseSize.width * scale,
        height: baseSize.height * scale,
    };
    const { family, color, mood } = companion;
    const eye = MOOD_EYE[mood];

    if (family === 'cat') {
        return (
            <svg viewBox="0 0 120 100" width={imageSize.width} height={imageSize.height} aria-hidden className="drop-shadow-sm">
                <ellipse cx="60" cy="72" rx="38" ry="9" fill="rgba(0,0,0,0.06)" />
                <ellipse cx="60" cy="58" rx="30" ry="24" fill={color} />
                <circle cx="60" cy="34" r="20" fill={color} />
                <polygon points="42,22 38,8 50,18" fill={color} />
                <polygon points="78,22 82,8 70,18" fill={color} />
                <circle cx="50" cy="32" r="3" fill="#3d3429" />
                <circle cx="70" cy="32" r="3" fill="#3d3429" />
                <text x="60" y="48" textAnchor="middle" fontSize="14" fill="#5c4f42">{eye}</text>
                {mood === 'sleepy' && <text x="86" y="16" fontSize="12" fill="#a89e94">z</text>}
            </svg>
        );
    }

    if (family === 'pig') {
        return (
            <svg viewBox="0 0 120 100" width={imageSize.width} height={imageSize.height} aria-hidden className="drop-shadow-sm">
                <ellipse cx="60" cy="72" rx="40" ry="10" fill="rgba(0,0,0,0.06)" />
                <ellipse cx="60" cy="56" rx="36" ry="28" fill={color} />
                <circle cx="60" cy="34" r="22" fill={color} />
                <ellipse cx="48" cy="38" rx="5" ry="7" fill="#e8a0a0" />
                <ellipse cx="72" cy="38" rx="5" ry="7" fill="#e8a0a0" />
                <circle cx="50" cy="30" r="2.5" fill="#3d3429" />
                <circle cx="70" cy="30" r="2.5" fill="#3d3429" />
                <text x="60" y="50" textAnchor="middle" fontSize="14" fill="#5c4f42">{eye}</text>
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 120 100" width={imageSize.width} height={imageSize.height} aria-hidden className="drop-shadow-sm">
            <ellipse cx="60" cy="72" rx="42" ry="10" fill="rgba(0,0,0,0.06)" />
            <ellipse cx="60" cy="58" rx="34" ry="28" fill={color} />
            <circle cx="60" cy="32" r="22" fill={color} />
            {companion.companionId === 'corgi' ? (
                <>
                    <ellipse cx="38" cy="20" rx="7" ry="12" fill={color} transform="rotate(-15 38 20)" />
                    <ellipse cx="82" cy="20" rx="7" ry="12" fill={color} transform="rotate(15 82 20)" />
                </>
            ) : (
                <>
                    <polygon points="38,22 32,6 46,16" fill={color} />
                    <polygon points="82,22 88,6 74,16" fill={color} />
                </>
            )}
            <circle cx="50" cy="30" r="3" fill="#3d3429" />
            <circle cx="70" cy="30" r="3" fill="#3d3429" />
            <text x="60" y="48" textAnchor="middle" fontSize="14" fill="#5c4f42">{eye}</text>
            {mood === 'sleepy' && <text x="88" y="18" fontSize="12" fill="#a89e94">z</text>}
        </svg>
    );
}
