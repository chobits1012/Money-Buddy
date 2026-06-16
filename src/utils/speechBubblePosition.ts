export interface RectLike {
    top: number;
    left: number;
    width: number;
    height: number;
    bottom: number;
}

export interface ViewportSize {
    width: number;
    height: number;
}

export interface SpeechBubbleLayout {
    top: number;
    left: number;
    width: number;
    placement: 'above' | 'below' | 'left' | 'right';
    tailOffset: number;
}

const VIEWPORT_PADDING = 12;
const TAIL_GAP = 10;
const TAIL_CLAMP = 20;

/** 依動物錨點與泡泡尺寸，計算不超出螢幕的對話框位置 */
export function computeSpeechBubbleLayout(
    anchor: RectLike,
    bubbleSize: { width: number; height: number },
    viewport: ViewportSize,
    padding = VIEWPORT_PADDING,
): SpeechBubbleLayout {
    const width = Math.min(
        Math.max(bubbleSize.width, 200),
        viewport.width - padding * 2,
    );
    const height = bubbleSize.height;
    const anchorCenterX = anchor.left + anchor.width / 2;
    const anchorCenterY = anchor.top + anchor.height / 2;
    const minLeft = padding;
    const maxLeft = viewport.width - width - padding;
    const minTop = padding;
    const maxTop = viewport.height - height - padding;

    type Placement = SpeechBubbleLayout['placement'];
    interface Candidate {
        placement: Placement;
        top: number;
        left: number;
        overflow: number;
    }

    const calcOverflow = (left: number, top: number): number => {
        const overflowLeft = Math.max(0, minLeft - left);
        const overflowRight = Math.max(0, left + width - (viewport.width - padding));
        const overflowTop = Math.max(0, minTop - top);
        const overflowBottom = Math.max(0, top + height - (viewport.height - padding));
        return overflowLeft + overflowRight + overflowTop + overflowBottom;
    };

    const baseCandidates: Array<Omit<Candidate, 'overflow'>> = [
        {
            placement: 'above',
            left: anchorCenterX - width / 2,
            top: anchor.top - height - TAIL_GAP,
        },
        {
            placement: 'below',
            left: anchorCenterX - width / 2,
            top: anchor.bottom + TAIL_GAP,
        },
        {
            placement: 'left',
            left: anchor.left - width - TAIL_GAP,
            top: anchorCenterY - height / 2,
        },
        {
            placement: 'right',
            left: anchor.left + anchor.width + TAIL_GAP,
            top: anchorCenterY - height / 2,
        },
    ];

    const candidates: Candidate[] = baseCandidates.map((candidate) => ({
        ...candidate,
        overflow: calcOverflow(candidate.left, candidate.top),
    }));

    const placementOrder: Placement[] = ['above', 'below', 'left', 'right'];
    const chosen = candidates.reduce((best, current) => {
        if (current.overflow < best.overflow) return current;
        if (current.overflow > best.overflow) return best;
        return placementOrder.indexOf(current.placement) < placementOrder.indexOf(best.placement)
            ? current
            : best;
    });

    const left = Math.max(minLeft, Math.min(chosen.left, maxLeft));
    const top = Math.max(minTop, Math.min(chosen.top, maxTop));
    const tailOffset = chosen.placement === 'left' || chosen.placement === 'right'
        ? Math.max(TAIL_CLAMP, Math.min(height - TAIL_CLAMP, anchorCenterY - top))
        : Math.max(TAIL_CLAMP, Math.min(width - TAIL_CLAMP, anchorCenterX - left));

    return { top, left, width, placement: chosen.placement, tailOffset };
}

export function toRectLike(rect: DOMRect): RectLike {
    return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
    };
}
