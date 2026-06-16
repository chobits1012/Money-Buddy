import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { FORMAT_TWD } from '../../utils/constants';
import { cn } from '../../utils/cn';
import { getPetAssetLabel } from '../../utils/portfolioPetAdapter';
import type { CompanionAvatarViewModel } from '../../types/petDashboard';
import {
    computeSpeechBubbleLayout,
    toRectLike,
    type SpeechBubbleLayout,
} from '../../utils/speechBubblePosition';
import { useCourtyardFullscreenOverlay } from './CourtyardFullscreenOverlayContext';

interface PetAnchoredSpeechBubbleProps {
    companion: CompanionAvatarViewModel | null;
    anchorRect: DOMRect | null;
    fullscreenMode?: boolean;
    onClose: () => void;
}

function formatPnL(companion: CompanionAvatarViewModel): string {
    const sign = companion.unrealizedPnL >= 0 ? '+' : '';
    if (companion.pnlCurrency === 'USD') {
        return `${sign}$${companion.unrealizedPnL.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }
    return `${sign}${FORMAT_TWD.format(companion.unrealizedPnL)}`;
}

export function PetAnchoredSpeechBubble({
    companion,
    anchorRect,
    fullscreenMode = false,
    onClose,
}: PetAnchoredSpeechBubbleProps) {
    const navigate = useNavigate();
    const fullscreenOverlay = useCourtyardFullscreenOverlay();
    const bubbleRef = useRef<HTMLDivElement>(null);
    const [layout, setLayout] = useState<SpeechBubbleLayout | null>(null);
    const isOpen = !!companion && !!anchorRect;
    const useFullscreenOverlay = fullscreenMode && !!fullscreenOverlay;
    const positionMode = useFullscreenOverlay ? 'absolute' : 'fixed';
    useLayoutEffect(() => {
        if (!companion || !anchorRect || !bubbleRef.current) {
            setLayout(null);
            return;
        }

        const measure = () => {
            const el = bubbleRef.current;
            if (!el) return;
            const vv = window.visualViewport;
            const viewport = {
                width: Math.floor(vv?.width ?? window.innerWidth),
                height: Math.floor(vv?.height ?? window.innerHeight),
            };
            const anchor = toRectLike(anchorRect);
            const next = computeSpeechBubbleLayout(
                anchor,
                { width: fullscreenMode ? 360 : 280, height: el.offsetHeight },
                viewport,
            );
            setLayout(next);
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(bubbleRef.current);
        window.visualViewport?.addEventListener('resize', measure);
        return () => {
            observer.disconnect();
            window.visualViewport?.removeEventListener('resize', measure);
        };
    }, [companion, anchorRect, fullscreenMode]);

    useLayoutEffect(() => {
        if (!isOpen) return;

        const dismiss = () => onClose();
        window.addEventListener('resize', dismiss);
        window.addEventListener('scroll', dismiss, true);
        return () => {
            window.removeEventListener('resize', dismiss);
            window.removeEventListener('scroll', dismiss, true);
        };
    }, [isOpen, onClose]);

    if (!isOpen || typeof document === 'undefined') {
        return null;
    }

    const goToHoldings = () => {
        if (!companion) return;
        onClose();
        navigate(companion.holdingsRoute);
    };

    const positioned = layout !== null;

    const bubbleNode = (
        <>
            <div
                className={cn(
                    positionMode === 'absolute' ? 'absolute inset-0' : 'fixed inset-0',
                    'z-40 bg-black/15 pointer-events-auto',
                )}
                onClick={onClose}
                aria-hidden
            />

            <div
                ref={bubbleRef}
                role="dialog"
                aria-modal
                className={cn(
                    'comic-bubble comic-bubble--anchored z-50 pointer-events-auto',
                    positionMode,
                    'bg-white/95 border-2 border-slate-700/80 rounded-2xl shadow-lg',
                    fullscreenMode ? 'px-3.5 py-2.5' : 'px-4 py-3',
                    layout?.placement === 'below' && 'comic-bubble--below',
                    layout?.placement === 'above' && 'comic-bubble--above',
                    layout?.placement === 'left' && 'comic-bubble--left',
                    layout?.placement === 'right' && 'comic-bubble--right',
                    positioned
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 scale-95 pointer-events-none',
                )}
                style={{
                    top: layout?.top ?? -9999,
                    left: layout?.left ?? 0,
                    width: layout?.width ?? (fullscreenMode ? 360 : 280),
                    ['--tail-offset' as string]: layout ? `${layout.tailOffset}px` : '50%',
                }}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-1.5 right-1.5 text-clay hover:text-slate-800 p-1"
                    aria-label="關閉"
                >
                    <span className="material-symbols-outlined text-base">close</span>
                </button>

                <p className="text-[10px] text-clay uppercase tracking-wide pr-6">
                    {companion.breedLabel} · {getPetAssetLabel(companion.assetType)}
                </p>
                <p className={cn(
                    'text-slate-800 leading-relaxed mt-1 font-medium pr-4',
                    fullscreenMode ? 'text-[13px]' : 'text-sm',
                )}>
                    {companion.companionMessage}
                </p>

                {!companion.isPlaceholder && (
                    <div className={cn(
                        'pt-2.5 border-t border-stoneSoft/70 text-center text-[11px]',
                        fullscreenMode ? 'mt-2 grid grid-cols-3 gap-1' : 'mt-2.5 grid grid-cols-3 gap-1.5',
                    )}>
                        <div>
                            <p className="text-[10px] text-clay">市值</p>
                            <p className="font-medium text-slate-800">
                                {FORMAT_TWD.format(companion.marketValueTWD)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-clay">佔比</p>
                            <p className="font-medium text-slate-800">
                                {companion.allocationPercent}%
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-clay">損益</p>
                            <p
                                className={cn(
                                    'font-medium',
                                    companion.unrealizedPnL >= 0 ? 'text-rust' : 'text-moss',
                                )}
                            >
                                {formatPnL(companion)}
                            </p>
                        </div>
                    </div>
                )}

                <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className={cn('w-full', fullscreenMode ? 'mt-2.5' : 'mt-3')}
                    onClick={goToHoldings}
                >
                    {companion.poolId ? '進入這個軍團' : '查看持倉明細'}
                </Button>
            </div>
        </>
    );

    const portalTarget = useFullscreenOverlay ? fullscreenOverlay : document.body;
    return createPortal(bubbleNode, portalTarget);
}
