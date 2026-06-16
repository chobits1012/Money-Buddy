import { FORMAT_TWD } from '../../utils/constants';
import { cn } from '../../utils/cn';
import { useState } from 'react';
import { usePetDashboardViewModel } from '../../hooks/usePetDashboardViewModel';
import { ViewModeToggle } from './ViewModeToggle';
import { PetScene } from './PetScene';
import { PetAnchoredSpeechBubble } from './PetAnchoredSpeechBubble';
import type { HomeViewMode } from '../../hooks/useHomeViewMode';
import type { CompanionAvatarViewModel } from '../../types/petDashboard';
import { useCourtyardFullscreenPreference } from '../../hooks/useCourtyardFullscreenPreference';
import { CourtyardFullscreenStage } from './CourtyardFullscreenStage';

interface PetDashboardProps {
    onOpenDeposit: () => void;
    onOpenWithdrawal: () => void;
    viewMode: HomeViewMode;
    onViewModeChange: (mode: HomeViewMode) => void;
}

interface FullscreenSelectionState {
    companion: CompanionAvatarViewModel;
    anchorRect: DOMRect;
}

export function PetDashboard({
    onOpenDeposit,
    onOpenWithdrawal,
    viewMode,
    onViewModeChange,
}: PetDashboardProps) {
    const {
        isFullscreen,
        openFullscreen,
        closeFullscreen,
    } = useCourtyardFullscreenPreference();
    const {
        courtyard,
        masterCapitalTotal,
        totalUnrealizedPnL,
        isLoadingQuotes,
    } = usePetDashboardViewModel();

    const pnlPositive = totalUnrealizedPnL >= 0;
    const [fullscreenSelection, setFullscreenSelection] = useState<FullscreenSelectionState | null>(null);

    const handleFullscreenSelection = (
        companion: CompanionAvatarViewModel,
        anchorRect: DOMRect,
    ) => {
        setFullscreenSelection((prev) =>
            prev?.companion.id === companion.id ? null : { companion, anchorRect },
        );
    };

    return (
        <div className="flex flex-col gap-5 animate-in fade-in duration-500">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-medium text-clay tracking-wide uppercase">
                        動物庭院
                    </h2>
                    <p className="text-[11px] text-clay/90 mt-0.5">
                        所有軍團夥伴住在同一座庭院，點擊牠們聊聊
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={isFullscreen ? closeFullscreen : openFullscreen}
                        className="rounded-lg border border-stoneSoft/80 bg-white/65 px-3 py-1.5 text-xs font-medium text-clayDark hover:bg-white/80 transition-colors"
                    >
                        {isFullscreen ? '一般模式' : '全螢幕'}
                    </button>
                    <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
                </div>
            </div>

            {!isFullscreen && <PetScene zones={courtyard.zones} />}

            <div className="glass-panel rounded-2xl p-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[11px] text-clay uppercase tracking-wide">總資產</p>
                        <p className="text-lg font-semibold text-slate-800 mt-0.5">
                            {FORMAT_TWD.format(masterCapitalTotal)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] text-clay uppercase tracking-wide">未實現損益</p>
                        <p
                            className={cn(
                                'text-lg font-semibold mt-0.5',
                                isLoadingQuotes
                                    ? 'text-clay'
                                    : pnlPositive
                                      ? 'text-rust'
                                      : 'text-moss',
                            )}
                        >
                            {isLoadingQuotes
                                ? '更新中…'
                                : `${pnlPositive ? '+' : ''}${FORMAT_TWD.format(totalUnrealizedPnL)}`}
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        onClick={onOpenDeposit}
                        className="flex-1 rounded-xl bg-moss/90 hover:bg-moss text-white text-sm py-2.5 font-medium transition-colors"
                    >
                        入金
                    </button>
                    <button
                        type="button"
                        onClick={onOpenWithdrawal}
                        className="flex-1 rounded-xl border border-stoneSoft/80 bg-white/50 hover:bg-white/70 text-clayDark text-sm py-2.5 font-medium transition-colors"
                    >
                        提領
                    </button>
                </div>
            </div>

            {isFullscreen && (
                <>
                    <CourtyardFullscreenStage
                        onExit={() => {
                            setFullscreenSelection(null);
                            closeFullscreen();
                        }}
                    >
                        <PetScene
                            zones={courtyard.zones}
                            presentation="fullscreen"
                            hideSpeechBubble
                            onCompanionSelect={handleFullscreenSelection}
                        />
                    </CourtyardFullscreenStage>
                    <PetAnchoredSpeechBubble
                        companion={fullscreenSelection?.companion ?? null}
                        anchorRect={fullscreenSelection?.anchorRect ?? null}
                        fullscreenMode
                        onClose={() => setFullscreenSelection(null)}
                    />
                </>
            )}
        </div>
    );
}
