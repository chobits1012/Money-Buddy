import type { StockAssetType } from '../../../types';
import type { FundPricingCurrency } from '../../../utils/fundCatalog';
import { Input } from '../../ui/Input';
import { cn } from '../../../utils/cn';

interface SharePriceTradeFieldsProps {
    type: StockAssetType;
    action: 'BUY' | 'SELL';
    isUSStock: boolean;
    isFund: boolean;
    isEditMode: boolean;
    isOffshoreFund: boolean;
    fundCurrency: FundPricingCurrency;
    shares: string;
    price: string;
    latestNav: string;
    navDate: string;
    availableShares: number;
    calcTotal: number;
    calcTotalTWD: number;
    exchangeRateUSD: number;
    fundExchangeRate: number;
    onSharesChange: (value: string) => void;
    onPriceChange: (value: string) => void;
    onLatestNavChange: (value: string) => void;
    onNavDateChange: (value: string) => void;
}

const currencyIcon = (currency: FundPricingCurrency, isUSStock: boolean) => {
    if (isUSStock || currency === 'USD') {
        return <span className="font-semibold px-1 text-xs">$</span>;
    }
    if (currency === 'EUR') {
        return <span className="font-semibold px-1 text-xs">€</span>;
    }
    return <span className="font-semibold px-1 text-xs">NT$</span>;
};

export const SharePriceTradeFields = ({
    type,
    action,
    isUSStock,
    isFund,
    isEditMode,
    isOffshoreFund,
    fundCurrency,
    shares,
    price,
    latestNav,
    navDate,
    availableShares,
    calcTotal,
    calcTotalTWD,
    exchangeRateUSD,
    fundExchangeRate,
    onSharesChange,
    onPriceChange,
    onLatestNavChange,
    onNavDateChange,
}: SharePriceTradeFieldsProps) => {
    const quantityLabel = isFund
        ? action === 'BUY'
            ? '申購單位數'
            : '贖回單位數'
        : type === 'CRYPTO'
          ? action === 'BUY'
              ? '買入數量'
              : '賣出數量'
          : action === 'BUY'
            ? '買入股數'
            : '賣出股數';

    const priceLabel = isFund
        ? action === 'BUY'
            ? `申購淨值 (${fundCurrency})`
            : `贖回淨值 (${fundCurrency})`
        : isUSStock
          ? action === 'BUY'
              ? '買入價格 (USD)'
              : '賣出價格 (USD)'
          : action === 'BUY'
            ? '買入價格 (TWD)'
            : '賣出價格 (TWD)';

    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label={quantityLabel}
                    placeholder="0"
                    value={shares}
                    onChange={(e) => onSharesChange(e.target.value)}
                />
                <Input
                    label={priceLabel}
                    placeholder="0"
                    value={price}
                    onChange={(e) => onPriceChange(e.target.value)}
                    icon={currencyIcon(fundCurrency, isUSStock)}
                />
            </div>

            {isFund && (
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label={`最新淨值 (${fundCurrency}，選填)`}
                        placeholder="留空將自動抓取"
                        value={latestNav}
                        onChange={(e) => onLatestNavChange(e.target.value)}
                        icon={currencyIcon(fundCurrency, false)}
                    />
                    <Input
                        type="date"
                        label="淨值日期"
                        value={navDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => onNavDateChange(e.target.value)}
                    />
                </div>
            )}

            {calcTotal > 0 && (
                <div className="p-3 rounded-xl bg-stoneSoft/30 border border-stoneSoft">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-clay">
                            {isEditMode
                                ? '修改後總金額'
                                : action === 'BUY'
                                  ? '此次投入金額'
                                  : '此次拿回金額'}
                        </p>
                        {action === 'SELL' && availableShares > 0 && (
                            <p className="text-[10px] text-clay bg-white/50 px-1.5 py-0.5 rounded">
                                {isFund ? '可贖回單位' : '可賣出餘額'}:{' '}
                                {availableShares.toLocaleString()}
                            </p>
                        )}
                    </div>
                    <div className="flex items-baseline gap-2">
                        {(isUSStock || isOffshoreFund) && (
                            <span className="text-lg font-light text-slate-800">
                                {fundCurrency === 'EUR' ? '€' : '$'}
                                {calcTotal.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 4,
                                })}
                            </span>
                        )}
                        <span
                            className={cn(
                                'font-medium',
                                isUSStock || isOffshoreFund
                                    ? 'text-sm text-clay'
                                    : 'text-lg text-slate-800 font-light',
                            )}
                        >
                            {isUSStock || isOffshoreFund
                                ? `≈ NT$${calcTotalTWD.toLocaleString()}`
                                : `NT$${calcTotalTWD.toLocaleString()}`}
                        </span>
                    </div>
                    {(isUSStock || isOffshoreFund) && (
                        <p className="text-[10px] text-clay/60 mt-1">
                            匯率: {isUSStock ? exchangeRateUSD : fundExchangeRate} ({fundCurrency}
                            /TWD)
                        </p>
                    )}
                </div>
            )}
        </>
    );
};
