import { usePortfolioStore } from '../../store/portfolioStore';
import { ASSET_LABELS, ASSET_COLORS } from '../../utils/constants';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Trash2Icon, ArrowUpRightIcon, ArrowDownRightIcon } from 'lucide-react';

export const TransactionHistory = () => {
    const { transactions, removeTransaction } = usePortfolioStore();

    if (transactions.length === 0) {
        return (
            <Card className="flex flex-col items-center justify-center p-8 text-center bg-surface/30 border-dashed border-white/10 mt-6">
                <p className="text-textSecondary text-sm">目前尚無任何資金投入紀錄</p>
            </Card>
        );
    }

    return (
        <div className="mt-8 flex flex-col gap-4">
            <h3 className="text-sm font-medium text-textSecondary flex items-center justify-between">
                近期資金異動
                <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-textSecondary/70">共 {transactions.length} 筆</span>
            </h3>

            <div className="flex flex-col gap-3">
                {transactions.map((tx) => {
                    // 根據動作判斷顏色與 Icon (此專案目前主要實作只進不出的 DEMO，依架構保留擴充性)
                    const isDeposit = tx.action === 'DEPOSIT';
                    const dateStr = new Date(tx.date).toLocaleDateString('zh-TW', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    });

                    return (
                        <Card key={tx.id} noPadding className="flex items-center justify-between p-3.5 card-hover">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ASSET_COLORS[tx.type]}`}>
                                    {isDeposit ? <ArrowUpRightIcon className="w-5 h-5" /> : <ArrowDownRightIcon className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-white/90 text-sm">{ASSET_LABELS[tx.type]}</p>
                                        {tx.note && (
                                            <span className="text-xs text-textSecondary bg-white/5 px-2 py-0.5 rounded">
                                                {tx.note}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-textSecondary mt-0.5">{dateStr}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className={`font-medium ${isDeposit ? 'text-accentSuccess' : 'text-textPrimary'}`}>
                                        {isDeposit ? '+' : '-'} {tx.amount.toLocaleString('en-US')}
                                    </p>
                                    {tx.amountUSD && tx.exchangeRate && (
                                        <p className="text-[10px] text-textSecondary/70 mt-0.5">
                                            ${tx.amountUSD.toLocaleString('en-US')} (匯率: {tx.exchangeRate})
                                        </p>
                                    )}
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTransaction(tx.id)}
                                    className="w-8 h-8 p-0 text-textSecondary hover:text-accentDanger hover:bg-accentDanger/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100"
                                    title="刪除此筆紀錄"
                                >
                                    <Trash2Icon className="w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
