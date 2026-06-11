import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { cn } from '../../utils/cn';

type Props = {
    open: boolean;
    email: string | null;
    isBusy: boolean;
    onUseCloud: () => void;
    onMerge: () => void;
    onUseLocal: () => void;
    onCancel: () => void;
};

export function AccountSwitchDialog({
    open,
    email,
    isBusy,
    onUseCloud,
    onMerge,
    onUseLocal,
    onCancel,
}: Props) {
    const [confirmLocalOverwrite, setConfirmLocalOverwrite] = useState(false);

    if (!open) return null;

    return (
        <>
            <div
                className={cn(
                    'fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] transition-opacity duration-300',
                    open ? 'opacity-100' : 'opacity-0 pointer-events-none',
                )}
            />
            <div className="fixed inset-0 z-[111] flex items-center justify-center p-4 pointer-events-none">
                <Card className="w-full max-w-sm flex flex-col gap-4 pointer-events-auto shadow-2xl border-stoneSoft">
                    <div className="flex flex-col gap-2">
                        <h3 className="text-xl font-light text-slate-800 tracking-tight">帳號與本地資料不一致</h3>
                        <p className="text-sm text-clayDark leading-relaxed">
                            目前登入：<span className="font-medium text-slate-800">{email ?? '（未知）'}</span>
                            <br />
                            此裝置上的資料屬於另一帳號或未綁定帳號。在選擇前，同步已暫停，避免誤寫入錯誤的雲端帳號。
                        </p>
                        <p className="text-xs text-clay leading-relaxed">
                            換帳號時通常選「僅使用雲端」。若確定要以這台裝置的資料為準，可選「以本地覆蓋雲端」。
                        </p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="primary"
                            className="w-full !bg-clayDark hover:!bg-clayDark/90 !text-white"
                            disabled={isBusy}
                            onClick={onUseCloud}
                        >
                            僅使用雲端（以雲端為主）
                        </Button>
                        <Button
                            variant="primary"
                            className="w-full !bg-moss hover:!bg-moss/90 !text-white"
                            disabled={isBusy}
                            onClick={onMerge}
                        >
                            合併本地與雲端後上傳
                        </Button>
                        <Button
                            variant="danger"
                            className="w-full"
                            disabled={isBusy}
                            onClick={() => setConfirmLocalOverwrite(true)}
                        >
                            以本地覆蓋雲端（刪除雲端舊資料）
                        </Button>
                        <Button variant="ghost" className="w-full text-clay" disabled={isBusy} onClick={onCancel}>
                            取消並登出（保留本地資料）
                        </Button>
                    </div>
                </Card>
            </div>

            <ConfirmModal
                isOpen={confirmLocalOverwrite}
                title="確定以本地覆蓋雲端？"
                message={
                    '此操作會用目前裝置上的資料，完全取代此帳號在雲端的備份。\n\n' +
                    '雲端上原有的資料將無法透過此 App 復原。請確認這是你想要的結果。'
                }
                confirmText="確定覆蓋雲端"
                cancelText="返回"
                requireText="覆蓋雲端"
                requirePlaceholder="請輸入「覆蓋雲端」"
                onConfirm={() => {
                    setConfirmLocalOverwrite(false);
                    onUseLocal();
                }}
                onCancel={() => setConfirmLocalOverwrite(false)}
            />
        </>
    );
}
