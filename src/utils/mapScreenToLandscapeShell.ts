import type { RectLike, ViewportSize } from './speechBubblePosition';

/** 直向螢幕上，將單點從螢幕座標轉為 landscape shell 內的未旋轉座標 */
export function mapScreenPointToLandscapeShell(
    screenX: number,
    screenY: number,
    viewport: ViewportSize,
): { x: number; y: number } {
    return {
        x: viewport.height - screenY,
        y: screenX,
    };
}

/** 直向螢幕上，將螢幕 DOMRect 轉為 landscape shell 內的邊界框 */
export function mapScreenRectToLandscapeShell(
    rect: RectLike,
    viewport: ViewportSize,
): RectLike {
    const corners = [
        mapScreenPointToLandscapeShell(rect.left, rect.top, viewport),
        mapScreenPointToLandscapeShell(rect.left + rect.width, rect.top, viewport),
        mapScreenPointToLandscapeShell(rect.left, rect.top + rect.height, viewport),
        mapScreenPointToLandscapeShell(rect.left + rect.width, rect.top + rect.height, viewport),
    ];

    const xs = corners.map((point) => point.x);
    const ys = corners.map((point) => point.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const right = Math.max(...xs);
    const bottom = Math.max(...ys);

    return {
        left,
        top,
        width: right - left,
        height: bottom - top,
        bottom,
    };
}

/** 全螢幕泡泡定位用的 viewport：直向手機時交換寬高 */
export function getLandscapeShellLayoutViewport(viewport: ViewportSize): ViewportSize {
    const isPortraitViewport = viewport.height > viewport.width;
    if (!isPortraitViewport) {
        return viewport;
    }

    return {
        width: viewport.height,
        height: viewport.width,
    };
}
