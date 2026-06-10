import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { StockAssetType, PurchaseRecord } from '../../../types';
import { SIMPLE_HOLDING_TYPES } from '../../../types';
import { usePortfolioStore } from '../../../store/portfolioStore';
import { FORMAT_TWD } from '../../../utils/constants';
import { resolveFundPricingCurrency } from '../../../utils/fundNav';
import { fetchLiveExchangeRates } from '../../../utils/exchangeRates';
import type { FundPricingCurrency } from '../../../utils/fundCatalog';

export interface UseHoldingFormParams {
    isOpen: boolean;
    onClose: () => void;
    type: StockAssetType;
    editingPurchase?: PurchaseRecord;
    editingHoldingId?: string;
    editingHoldingName?: string;
    poolId?: string;
}

export function useHoldingForm({
    isOpen,
    onClose,
    type,
    editingPurchase,
    editingHoldingId,
    editingHoldingName,
    poolId,
}: UseHoldingFormParams) {
    const {
        buyStock,
        updatePurchase,
        exchangeRateUSD,
        exchangeRateEUR,
        getIdleCapital,
        getUsStockAvailableCapital,
        holdings,
        pools,
        fetchFundNavForHoldings,
    } = usePortfolioStore();

    const isUSStock = type === 'US_STOCK';
    const isFund = type === 'FUNDS';
    const isSimpleMode = SIMPLE_HOLDING_TYPES.includes(type) && !isFund;
    const isEditMode = !!editingPurchase;

    const availableCapital = poolId
        ? (pools.find((p) => p.id === poolId && !p.deletedAt)?.currentCash || 0)
        : (isUSStock ? getUsStockAvailableCapital() : getIdleCapital());

    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
    const [shares, setShares] = useState('');
    const [price, setPrice] = useState('');
    const [latestNav, setLatestNav] = useState('');
    const [navDate, setNavDate] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    const currentHolding = holdings.find(
        (h) =>
            !h.deletedAt &&
            h.type === type &&
            h.name.toLowerCase() === name.trim().toLowerCase() &&
            h.poolId === poolId,
    );
    const availableShares = currentHolding ? currentHolding.shares : 0;
    const availableAmount = currentHolding ? currentHolding.totalAmount : 0;

    const fundCurrency: FundPricingCurrency = isFund
        ? resolveFundPricingCurrency(symbol, name.trim())
        : 'TWD';
    const isOffshoreFund = isFund && fundCurrency !== 'TWD';
    const fundExchangeRate =
        fundCurrency === 'EUR'
            ? exchangeRateEUR
            : fundCurrency === 'USD'
              ? exchangeRateUSD
              : 1;

    const numShares = Number(shares.replace(/,/g, '') || 0);
    const numPrice = Number(price.replace(/,/g, '') || 0);
    const calcTotal = numShares > 0 && numPrice > 0 ? numShares * numPrice : 0;
    const calcTotalTWD = isUSStock
        ? Math.round(calcTotal * exchangeRateUSD)
        : isOffshoreFund
          ? Math.round(calcTotal * fundExchangeRate)
          : calcTotal;

    const numAmount = Number(amount.replace(/,/g, '') || 0);

    useEffect(() => {
        if (!isOpen || !isFund || !isOffshoreFund) return;
        void fetchLiveExchangeRates().then((rates) => {
            const updates: { exchangeRateUSD?: number; exchangeRateEUR?: number } = {};
            if (rates.usd) updates.exchangeRateUSD = rates.usd;
            if (rates.eur) updates.exchangeRateEUR = rates.eur;
            if (Object.keys(updates).length > 0) {
                usePortfolioStore.setState(updates);
            }
        });
    }, [isOpen, isFund, isOffshoreFund, symbol, name]);

    useEffect(() => {
        if (!isOpen) return;

        if (editingPurchase) {
            const editingHolding = editingHoldingId
                ? holdings.find((h) => !h.deletedAt && h.id === editingHoldingId)
                : undefined;
            setName(editingHoldingName || '');
            setSymbol('');
            setAction(editingPurchase.action || 'BUY');
            if (isSimpleMode) {
                setAmount(editingPurchase.totalCost.toLocaleString('en-US'));
            } else {
                const editingCurrency = resolveFundPricingCurrency(
                    editingHolding?.symbol,
                    editingHoldingName || editingHolding?.name,
                );
                const editRate =
                    editingPurchase.exchangeRate ??
                    (editingCurrency === 'EUR'
                        ? exchangeRateEUR
                        : editingCurrency === 'USD'
                          ? exchangeRateUSD
                          : 1);
                setShares(String(editingPurchase.shares));
                if (editingCurrency === 'TWD') {
                    setPrice(String(editingPurchase.pricePerShare));
                } else {
                    setPrice(String(Number((editingPurchase.pricePerShare / editRate).toFixed(4))));
                }
                if (editingHolding?.currentPriceEUR !== undefined) {
                    setLatestNav(String(editingHolding.currentPriceEUR));
                } else if (editingHolding?.currentPriceUSD !== undefined) {
                    setLatestNav(String(editingHolding.currentPriceUSD));
                } else if (editingHolding?.currentPrice !== undefined) {
                    setLatestNav(String(editingHolding.currentPrice));
                } else {
                    setLatestNav('');
                }
                setNavDate(
                    editingHolding?.currentPriceDate?.slice(0, 10) ||
                        new Date().toISOString().slice(0, 10),
                );
            }
            setNote(editingPurchase.note || '');
        } else {
            setName('');
            setSymbol('');
            setAction('BUY');
            setShares('');
            setPrice('');
            setLatestNav('');
            setNavDate(new Date().toISOString().slice(0, 10));
            setAmount('');
            setNote('');
        }
        setError('');
    }, [
        isOpen,
        editingPurchase,
        editingHoldingName,
        editingHoldingId,
        isSimpleMode,
        holdings,
        exchangeRateEUR,
        exchangeRateUSD,
    ]);

    const getNamePlaceholder = () => {
        switch (type) {
            case 'TAIWAN_STOCK':
                return '例如: 台積電、0050';
            case 'US_STOCK':
                return '例如: AAPL、QQQ';
            case 'FUNDS':
                return '例如: 安聯台灣科技、奔騰、元大高股息';
            case 'CRYPTO':
                return '例如: BTC、ETH';
            default:
                return '請輸入名稱';
        }
    };

    const clearError = () => setError('');

    const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '');
        if (!val) {
            setAmount('');
            setError('');
            return;
        }
        setAmount(Number(val).toLocaleString('en-US'));
        setError('');
    };

    const handleDecimalInput = (value: string, setter: (v: string) => void) => {
        const sanitized = value.replace(/[^\d.]/g, '');
        const [integerPart, decimalPart] = sanitized.split('.');
        if (decimalPart !== undefined) {
            setter(`${integerPart}.${decimalPart.slice(0, 6)}`);
        } else {
            setter(integerPart);
        }
        setError('');
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('請輸入標的名稱');
            return;
        }

        if (isSimpleMode) {
            if (isNaN(numAmount) || numAmount <= 0) {
                setError('請輸入有效的金額');
                return;
            }

            if (action === 'SELL' && !isEditMode && numAmount > availableAmount) {
                setError(
                    `減少的金額不能大於目前總投入金額 (${FORMAT_TWD.format(availableAmount)})`,
                );
                return;
            }

            if (isEditMode && editingHoldingId && editingPurchase) {
                const diff = numAmount - editingPurchase.totalCost;
                if (diff > 0 && diff > availableCapital) {
                    setError('增加的金額超出剩餘可動用資金');
                    return;
                }
                updatePurchase(editingHoldingId, editingPurchase.id, {
                    action,
                    shares: 1,
                    pricePerShare: numAmount,
                    totalCost: numAmount,
                    note: note || undefined,
                });
            } else {
                if (action === 'BUY' && numAmount > availableCapital) {
                    setError(`超出剩餘可動用資金 (NT$ ${availableCapital.toLocaleString()})`);
                    return;
                }
                buyStock({
                    type,
                    name: trimmedName,
                    symbol: symbol || undefined,
                    action,
                    shares: 1,
                    pricePerShare: numAmount,
                    totalCost: numAmount,
                    note: note || undefined,
                    poolId,
                });
            }
        } else {
            if (isNaN(numShares) || numShares <= 0) {
                setError('請輸入有效的數量');
                return;
            }
            if (isNaN(numPrice) || numPrice <= 0) {
                setError(`請輸入有效的${action === 'BUY' ? '買入' : '賣出'}價格`);
                return;
            }

            const parsedLatestNav = Number(latestNav || 0);
            const currentPriceForSubmit =
                isFund && parsedLatestNav > 0
                    ? isOffshoreFund
                        ? Math.round(parsedLatestNav * fundExchangeRate * 100) / 100
                        : parsedLatestNav
                    : undefined;
            const currentPriceDateForSubmit =
                isFund && currentPriceForSubmit ? navDate : undefined;
            const fundPricePerShareTWD = isOffshoreFund
                ? Math.round(numPrice * fundExchangeRate * 100) / 100
                : numPrice;

            if (isFund && currentPriceForSubmit && !navDate) {
                setError('請選擇淨值日期');
                return;
            }

            if (action === 'SELL' && !isEditMode && numShares > availableShares) {
                setError(
                    `${isFund ? '贖回單位' : '賣出數量'}不能大於目前持有${isFund ? '單位' : '數量'} (${availableShares.toLocaleString()})`,
                );
                return;
            }

            if (isEditMode && editingHoldingId && editingPurchase) {
                const diff = isUSStock
                    ? action === 'BUY'
                        ? calcTotal - (editingPurchase.totalCostUSD || 0)
                        : 0
                    : action === 'BUY'
                      ? calcTotalTWD - editingPurchase.totalCost
                      : 0;

                if (diff > 0 && diff > availableCapital && action === 'BUY') {
                    const label = isUSStock ? '美股帳戶' : '總資產';
                    const currencySymbol = isUSStock ? '$' : 'NT$ ';
                    setError(
                        `增加的金額超出${label}剩餘可動用資金 (${currencySymbol}${availableCapital.toLocaleString()})`,
                    );
                    return;
                }
                updatePurchase(editingHoldingId, editingPurchase.id, {
                    action,
                    shares: numShares,
                    pricePerShare: isUSStock ? numPrice : fundPricePerShareTWD,
                    totalCost: calcTotalTWD,
                    totalCostUSD: isUSStock ? calcTotal : undefined,
                    currentPrice: currentPriceForSubmit,
                    currentPriceDate: currentPriceDateForSubmit,
                    exchangeRate: isUSStock
                        ? exchangeRateUSD
                        : isOffshoreFund
                          ? fundExchangeRate
                          : undefined,
                    note: note || undefined,
                });
            } else {
                if (action === 'BUY') {
                    const isOverLimit = isUSStock
                        ? calcTotal > availableCapital
                        : calcTotalTWD > availableCapital;
                    if (isOverLimit) {
                        const label = isUSStock ? '美股帳戶' : '總資產';
                        const currencySymbol = isUSStock ? '$' : 'NT$ ';
                        setError(
                            `超出${label}剩餘可動用資金 (${currencySymbol}${availableCapital.toLocaleString()})`,
                        );
                        return;
                    }
                }
                buyStock({
                    type,
                    name: trimmedName,
                    symbol: symbol || undefined,
                    action,
                    shares: numShares,
                    pricePerShare: isUSStock ? numPrice : fundPricePerShareTWD,
                    totalCost: calcTotalTWD,
                    totalCostUSD: isUSStock ? calcTotal : undefined,
                    currentPrice: currentPriceForSubmit,
                    currentPriceDate: currentPriceDateForSubmit,
                    exchangeRate: isUSStock
                        ? exchangeRateUSD
                        : isOffshoreFund
                          ? fundExchangeRate
                          : undefined,
                    note: note || undefined,
                    poolId,
                });
            }
        }

        if (isFund) {
            void fetchFundNavForHoldings();
        }

        onClose();
    };

    return {
        type,
        isUSStock,
        isFund,
        isSimpleMode,
        isEditMode,
        action,
        setAction,
        name,
        setName,
        symbol,
        setSymbol,
        note,
        setNote,
        error,
        amount,
        shares,
        setShares,
        price,
        setPrice,
        latestNav,
        setLatestNav,
        navDate,
        setNavDate,
        availableShares,
        fundCurrency,
        isOffshoreFund,
        fundExchangeRate,
        calcTotal,
        calcTotalTWD,
        exchangeRateUSD,
        clearError,
        handleAmountChange,
        handleDecimalInput,
        handleSubmit,
        getNamePlaceholder,
    };
}
