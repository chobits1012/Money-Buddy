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
    placement: 'above' | 'below';
    tailLeft: number;
}

const DEFAULT_BUBBLE_WIDTH = 280;
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
        DEFAULT_BUBBLE_WIDTH,
        viewport.width - padding * 2,
    );
    const height = bubbleSize.height;
    const anchorCenterX = anchor.left + anchor.width / 2;

    let placement: 'above' | 'below' = 'above';
    let top = anchor.top - height - TAIL_GAP;

    const fitsAbove = top >= padding;
    const fitsBelow = anchor.bottom + TAIL_GAP + height <= viewport.height - padding;

    if (!fitsAbove && fitsBelow) {
        placement = 'below';
        top = anchor.bottom + TAIL_GAP;
    } else if (!fitsAbove && !fitsBelow) {
        placement = 'above';
        top = Math.max(padding, viewport.height - padding - height);
    }

    let left = anchorCenterX - width / 2;
    left = Math.max(padding, Math.min(left, viewport.width - width - padding));

    const tailLeft = Math.max(
        TAIL_CLAMP,
        Math.min(width - TAIL_CLAMP, anchorCenterX - left),
    );

    return { top, left, width, placement, tailLeft };
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
