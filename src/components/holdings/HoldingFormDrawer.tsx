import type { StockAssetType, PurchaseRecord } from '../../types';
import { ASSET_LABELS, ASSET_COLORS } from '../../utils/constants';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useHoldingForm } from './form/useHoldingForm';
import { HoldingFormActionToggle } from './form/HoldingFormActionToggle';
import { HoldingFormNameField } from './form/HoldingFormNameField';
import { SimpleAmountField } from './form/SimpleAmountField';
import { SharePriceTradeFields } from './form/SharePriceTradeFields';

interface BuyStockDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    type: StockAssetType;
    editingPurchase?: PurchaseRecord;
    editingHoldingId?: string;
    editingHoldingName?: string;
    poolId?: string;
}

export const BuyStockDrawer = ({
    isOpen,
    onClose,
    type,
    editingPurchase,
    editingHoldingId,
    editingHoldingName,
    poolId,
}: BuyStockDrawerProps) => {
    const form = useHoldingForm({
        isOpen,
        onClose,
        type,
        editingPurchase,
        editingHoldingId,
        editingHoldingName,
        poolId,
    });

    if (!isOpen) return null;

    const {
        isUSStock,
        isFund,
        isSimpleMode,
        isEditMode,
        action,
        setAction,
        name,
        setName,
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
    } = form;

    return (
        <>
            <div
                className={cn(
                    'fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300',
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
                )}
                onClick={onClose}
            />

            <div
                className={cn(
                    'fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-stoneSoft rounded-t-3xl p-6 transition-transform duration-300 ease-in-out shadow-2xl max-w-md mx-auto',
                    isOpen ? 'translate-y-0' : 'translate-y-full',
                )}
            >
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className={cn('px-3 py-1 text-xs font-semibold rounded-full', ASSET_COLORS[type])}>
                            {ASSET_LABELS[type]}
                        </div>
                        <h3 className="text-xl font-light text-slate-800">
                            {isEditMode ? '編輯紀錄' : isSimpleMode ? '新增紀錄' : '新增交易'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-clay hover:text-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <HoldingFormActionToggle
                        action={action}
                        isSimpleMode={isSimpleMode}
                        isFund={isFund}
                        onSelect={(next) => {
                            setAction(next);
                            clearError();
                        }}
                    />

                    <HoldingFormNameField
                        type={type}
                        name={name}
                        placeholder={getNamePlaceholder()}
                        error={error}
                        isEditMode={isEditMode}
                        onNameChange={(value) => {
                            setName(value);
                            if (type !== 'TAIWAN_STOCK' && type !== 'US_STOCK' && type !== 'FUNDS') {
                                setSymbol('');
                            }
                            clearError();
                        }}
                        onSelect={(selectedName, sym) => {
                            setName(type === 'FUNDS' ? selectedName : `${selectedName} (${sym})`);
                            setSymbol(sym);
                            clearError();
                        }}
                    />

                    {isSimpleMode ? (
                        <SimpleAmountField
                            action={action}
                            amount={amount}
                            onChange={handleAmountChange}
                        />
                    ) : (
                        <SharePriceTradeFields
                            type={type}
                            action={action}
                            isUSStock={isUSStock}
                            isFund={isFund}
                            isEditMode={isEditMode}
                            isOffshoreFund={isOffshoreFund}
                            fundCurrency={fundCurrency}
                            shares={shares}
                            price={price}
                            latestNav={latestNav}
                            navDate={navDate}
                            availableShares={availableShares}
                            calcTotal={calcTotal}
                            calcTotalTWD={calcTotalTWD}
                            exchangeRateUSD={exchangeRateUSD}
                            fundExchangeRate={fundExchangeRate}
                            onSharesChange={(value) => handleDecimalInput(value, setShares)}
                            onPriceChange={(value) => handleDecimalInput(value, setPrice)}
                            onLatestNavChange={(value) => handleDecimalInput(value, setLatestNav)}
                            onNavDateChange={(value) => {
                                setNavDate(value);
                                clearError();
                            }}
                        />
                    )}

                    <Input
                        label="備註 (選填)"
                        placeholder={
                            isFund
                                ? '例如: 單筆申購、每月定期定額'
                                : isSimpleMode
                                  ? '例如: 定期定額、單筆申購'
                                  : '例如: 定期定額、加碼'
                        }
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />

                    {error && (
                        <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-rust text-sm">
                            {error}
                        </div>
                    )}

                    <Button type="submit" size="lg" className="w-full mt-2">
                        {isEditMode ? '確認修改' : '確認'}
                    </Button>
                </form>
            </div>
        </>
    );
};
