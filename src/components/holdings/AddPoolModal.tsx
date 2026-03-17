import { useState } from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { StockAssetType } from '../../types';

interface AddPoolModalProps {
    type: StockAssetType;
    availableTotal: number;
    usStockAvailable: number;
    exchangeRateUSD: number;
    onClose: () => void;
    onSubmit: (name: string, amount: number) => void;
}

export const AddPoolModal = ({
    type,
    availableTotal,
    usStockAvailable,
    exchangeRateUSD,
    onClose,
    onSubmit
}: AddPoolModalProps) => {
    const [poolName, setPoolName] = useState('');
    const [poolAmount, setPoolAmount] = useState('');
    const [poolAmountTWD, setPoolAmountTWD] = useState('');
    const [poolError, setPoolError] = useState('');

    const isUSStock = type === 'US_STOCK';

    const handleAddPool = () => {
        const amount = Number(poolAmount.replace(/,/g, ''));
        if (!poolName) { setPoolError('請輸入軍團名稱'); return; }
        if (isNaN(amount) || amount <= 0) { setPoolError('請輸入有效金額'); return; }
        
        const limit = isUSStock ? usStockAvailable : availableTotal;
        if (amount > limit) { 
            setPoolError(`金額不可大於可用${isUSStock ? '美金' : '資產'}`); 
            return; 
        }
        
        onSubmit(poolName, amount);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <Card className="w-full max-w-sm z-[101] flex flex-col gap-5 animate-in zoom-in-95 duration-200 shadow-2xl">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-light text-slate-800">新增戰備軍團</h3>
                    <p className="text-xs text-clay">建立獨立入金池，隔離資產損益</p>
                </div>
                <div className="flex flex-col gap-4">
                    <Input 
                        label="軍團名稱" 
                        placeholder="例如：防禦大軍" 
                        value={poolName} 
                        onChange={(e) => { setPoolName(e.target.value); setPoolError(''); }}
                        error={poolError && !poolName ? poolError : ''}
                        autoFocus
                    />
                    <div className="flex flex-col gap-4">
                        {isUSStock ? (
                            <>
                                <Input 
                                    label="撥款金額 (USD)" 
                                    placeholder="0.00"
                                    value={poolAmount}
                                    onChange={(e) => { 
                                        const val = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
                                        setPoolAmount(val);
                                        const usd = Number(val);
                                        if (!isNaN(usd) && val) {
                                            setPoolAmountTWD(Math.round(usd * exchangeRateUSD).toLocaleString('en-US'));
                                        } else {
                                            setPoolAmountTWD('');
                                        }
                                        setPoolError('');
                                    }}
                                    icon={<span className="font-semibold px-1 text-xs">$</span>}
                                    error={poolError && !poolAmount ? poolError : ''}
                                />
                                <Input 
                                    label="撥款金額 (TWD)" 
                                    placeholder="0"
                                    value={poolAmountTWD}
                                    onChange={(e) => { 
                                        const val = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '');
                                        const twd = Number(val);
                                        setPoolAmountTWD(val ? twd.toLocaleString('en-US') : '');
                                        if (!isNaN(twd) && val) {
                                            setPoolAmount((twd / exchangeRateUSD).toFixed(2));
                                        } else {
                                            setPoolAmount('');
                                        }
                                        setPoolError('');
                                    }}
                                    icon={<span className="font-semibold px-1 text-xs">NT$</span>}
                                />
                            </>
                        ) : (
                            <Input 
                                label="撥款金額 (TWD)" 
                                placeholder="0"
                                value={poolAmount}
                                onChange={(e) => { 
                                    const val = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '');
                                    setPoolAmount(val ? Number(val).toLocaleString('en-US') : '');
                                    setPoolError('');
                                }}
                                icon={<span className="font-semibold px-1 text-xs">NT$</span>}
                                error={poolError && !poolAmount ? poolError : ''}
                            />
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-2">
                    <button onClick={onClose} className="px-4 py-2 text-clay hover:text-slate-800 transition-colors">取消</button>
                    <Button variant="primary" onClick={handleAddPool}>確認建立</Button>
                </div>
            </Card>
        </div>
    );
};
