import { createContext, useContext } from 'react';

/** 全螢幕舞台外層（未旋轉）的 overlay 根節點，供對話泡泡 portal 使用 */
export const CourtyardFullscreenOverlayContext = createContext<HTMLElement | null>(null);

export function useCourtyardFullscreenOverlay(): HTMLElement | null {
    return useContext(CourtyardFullscreenOverlayContext);
}
