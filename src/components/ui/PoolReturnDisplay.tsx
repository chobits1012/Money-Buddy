import { FORMAT_TWD } from '../../utils/constants';
import { cn } from '../../utils/cn';
import type { PoolReturnMetrics } from '../../utils/poolReturnMetrics';
import { toTwdApprox } from '../../utils/poolReturnMetrics';

interface PoolReturnDisplayProps {
    metrics: PoolReturnMetrics;
    exchangeRateUSD?: number;
    /** 美股合計列附 TWD 約當 */
    showTwdApprox?: boolean;
    compact?: boolean;
    className?: string;
}

const formatSignedUsd = (value: number): string => {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}$${value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
};

const formatSignedTwd = (value: number): string => {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${FORMAT_TWD.format(value)}`;
};

export const PoolReturnDisplay = ({
    metrics,
    exchangeRateUSD = 31,
    showTwdApprox = false,
    compact = false,
    className,
}: PoolReturnDisplayProps) => {
    if (metrics.holdingCount === 0 || metrics.costBasis <= 0) {
        return (
            <p className={cn('text-[10px] text-clay/60', className)}>
                尚無持倉，無法計算報酬率
            </p>
        );
    }

    const rate = metrics.returnRatePercent ?? 0;
    const isPositive = rate > 0;
    const isNegative = rate < 0;
    const rateColor = isPositive ? 'text-rust' : isNegative ? 'text-moss' : 'text-clay';
    const isUsd = metrics.currency === 'USD';

    const pnlLabel = isUsd
        ? formatSignedUsd(metrics.totalPnL)
        : formatSignedTwd(metrics.totalPnL);

    if (compact) {
        return (
            <div className={cn('flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5', className)}>
                <span className={cn('text-xs font-semibold tabular-nums', rateColor)}>
                    {rate > 0 ? '+' : ''}{rate.toFixed(2)}%
                </span>
                <span className={cn('text-[10px] tabular-nums', rateColor)}>
                    ({pnlLabel}{isUsd ? ' USD' : ''})
                </span>
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col gap-0.5', className)}>
            <p className="text-[10px] text-clayDark uppercase tracking-wider">投資報酬率</p>
            <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
                <span className={cn('text-sm font-semibold tabular-nums', rateColor)}>
                    {rate > 0 ? '+' : ''}{rate.toFixed(2)}%
                </span>
                <span className={cn('text-[11px] font-medium tabular-nums', rateColor)}>
                    {pnlLabel}
                    {isUsd ? ' USD' : ''}
                </span>
            </div>
            {showTwdApprox && isUsd && (
                <p className="text-[10px] text-clay/70 tabular-nums">
                    ≈ {formatSignedTwd(toTwdApprox(metrics.totalPnL, exchangeRateUSD))}
                </p>
            )}
        </div>
    );
};
