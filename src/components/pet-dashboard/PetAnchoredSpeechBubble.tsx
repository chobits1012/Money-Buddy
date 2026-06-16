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

interface PetAnchoredSpeechBubbleProps {
    companion: CompanionAvatarViewModel | null;
    anchorRect: DOMRect | null;
    positioningRoot?: HTMLElement | null;
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
    positioningRoot = null,
    onClose,
}: PetAnchoredSpeechBubbleProps) {
    const navigate = useNavigate();
    const bubbleRef = useRef<HTMLDivElement>(null);
    const [layout, setLayout] = useState<SpeechBubbleLayout | null>(null);
    const isOpen = !!companion && !!anchorRect;
    const isInlineOverlay = !!positioningRoot;

    useLayoutEffect(() => {
        if (!companion || !anchorRect || !bubbleRef.current) {
            setLayout(null);
            return;
        }

        const measure = () => {
            const el = bubbleRef.current;
            if (!el) return;
            const rootRect = positioningRoot?.getBoundingClientRect();
            const viewport = rootRect
                ? { width: rootRect.width, height: rootRect.height }
                : { width: window.innerWidth, height: window.innerHeight };
            const anchor = rootRect
                ? {
                    top: anchorRect.top - rootRect.top,
                    left: anchorRect.left - rootRect.left,
                    width: anchorRect.width,
                    height: anchorRect.height,
                    bottom: anchorRect.bottom - rootRect.top,
                }
                : toRectLike(anchorRect);
            const next = computeSpeechBubbleLayout(
                anchor,
                { width: 280, height: el.offsetHeight },
                viewport,
            );
            setLayout(next);
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(bubbleRef.current);
        return () => observer.disconnect();
    }, [companion, anchorRect, positioningRoot]);

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
                className={isInlineOverlay ? 'absolute inset-0 z-40 bg-black/15' : 'fixed inset-0 z-40 bg-black/15'}
                onClick={onClose}
                aria-hidden
            />

            <div
                ref={bubbleRef}
                role="dialog"
                aria-modal
                className={cn(
                    isInlineOverlay
                        ? 'comic-bubble comic-bubble--anchored absolute z-50'
                        : 'comic-bubble comic-bubble--anchored fixed z-50',
                    'bg-white/95 border-2 border-slate-700/80 rounded-2xl px-4 py-3 shadow-lg',
                    layout?.placement === 'below'
                        ? 'comic-bubble--below'
                        : 'comic-bubble--above',
                    positioned
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 scale-95 pointer-events-none',
                )}
                style={{
                    top: layout?.top ?? -9999,
                    left: layout?.left ?? 0,
                    width: layout?.width ?? 280,
                    ['--tail-left' as string]: layout ? `${layout.tailLeft}px` : '50%',
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
                <p className="text-sm text-slate-800 leading-relaxed mt-1 font-medium pr-4">
                    {companion.companionMessage}
                </p>

                {!companion.isPlaceholder && (
                    <div className="mt-2.5 pt-2.5 border-t border-stoneSoft/70 grid grid-cols-3 gap-1.5 text-center text-[11px]">
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
                    className="w-full mt-3"
                    onClick={goToHoldings}
                >
                    {companion.poolId ? '進入這個軍團' : '查看持倉明細'}
                </Button>
            </div>
        </>
    );

    if (isInlineOverlay) {
        return bubbleNode;
    }

    return createPortal(bubbleNode, document.body);
}
