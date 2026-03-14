import { usePortfolioStore } from '../../store/portfolioStore';
import { ASSET_LABELS, ASSET_COLORS } from '../../utils/constants';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useState } from 'react';

export const TransactionHistory = () => {
    const { transactions, removeTransaction } = usePortfolioStore();
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // 過濾掉舊的已移除類型 (如 BONDS)，避免 label 查找失敗
    const validTypes = new Set(['TAIWAN_STOCK', 'US_STOCK', 'FUNDS']);
    const filteredTransactions = transactions.filter((tx) => validTypes.has(tx.type));

    if (filteredTransactions.length === 0) {
        return (
            <Card className="flex flex-col items-center justify-center p-8 text-center bg-white/20 border-dashed border-stoneSoft mt-6">
                <p className="text-clay text-sm">目前尚無任何資金投入紀錄</p>
            </Card>
        );
    }

    return (
        <div className="mt-8 flex flex-col gap-4">
            <h3 className="text-sm font-medium text-clay tracking-wide uppercase flex items-center justify-between">
                近期資金異動
                <span className="text-xs bg-stoneSoft/50 px-2 py-0.5 rounded text-clay/70">共 {filteredTransactions.length} 筆</span>
            </h3>

            <div className="flex flex-col gap-3">
                {filteredTransactions.map((tx) => {
                    // 根據動作判斷顏色與 Icon
                    const isDeposit = tx.action === 'DEPOSIT';
                    const dateStr = new Date(tx.date).toLocaleDateString('zh-TW', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    });

                    return (
                        <Card key={tx.id} noPadding className="flex items-center justify-between p-3.5 card-hover group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ASSET_COLORS[tx.type]}`}>
                                    <span className="material-symbols-outlined text-xl">
                                        {isDeposit ? 'trending_up' : 'trending_down'}
                                    </span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-slate-800 text-sm">{ASSET_LABELS[tx.type]}</p>
                                        {tx.note && (
                                            <span className="text-xs text-clay bg-stoneSoft/40 px-2 py-0.5 rounded">
                                                {tx.note}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-clay mt-0.5">{dateStr}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className={`font-medium ${isDeposit ? 'text-moss' : 'text-rust'}`}>
                                        {isDeposit ? '+' : '-'} {tx.amount.toLocaleString('en-US')}
                                    </p>
                                    {tx.amountUSD && tx.exchangeRate && (
                                        <p className="text-[10px] text-clay/70 mt-0.5">
                                            ${tx.amountUSD.toLocaleString('en-US')} (匯率: {tx.exchangeRate})
                                        </p>
                                    )}
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setConfirmDeleteId(tx.id)}
                                    className="w-8 h-8 p-0 text-clay hover:text-rust hover:bg-rust/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100"
                                    title="刪除此筆紀錄"
                                >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <ConfirmModal
                isOpen={!!confirmDeleteId}
                title="刪除紀錄"
                message="確定要刪除這筆紀錄嗎？此動作無法復原。"
                confirmText="刪除"
                onConfirm={() => {
                    if (confirmDeleteId) removeTransaction(confirmDeleteId);
                    setConfirmDeleteId(null);
                }}
                onCancel={() => setConfirmDeleteId(null)}
            />
        </div>
    );
};
