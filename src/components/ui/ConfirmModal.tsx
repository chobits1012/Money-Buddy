import React, { useEffect } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { cn } from '../../utils/cn';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: 'danger' | 'primary';
    isAlert?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = '確認',
    cancelText = '取消',
    onConfirm,
    onCancel,
    variant = 'danger',
    isAlert = false
}) => {
    // Escape 鍵可以關閉 Modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                if (isAlert) {
                    onConfirm();
                } else if (onCancel) {
                    onCancel();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel, onConfirm, isAlert]);

    if (!isOpen) return null;

    return (
        <>
            {/* 背景遮罩 */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={isAlert ? onConfirm : (onCancel || onConfirm)}
            />
            {/* 彈出視窗容器 */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <Card 
                    className={cn(
                        "w-full max-w-sm flex flex-col gap-4 pointer-events-auto transition-all duration-300 transform",
                        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
                    )}
                >
                    <div className="flex flex-col gap-2.5">
                        <h3 className="text-2xl font-light text-slate-800 tracking-tight">{title}</h3>
                        <p className="text-base text-clayDark leading-relaxed font-medium whitespace-pre-line">{message}</p>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-4">
                        {isAlert ? (
                            <Button variant="primary" onClick={onConfirm} autoFocus>
                                {confirmText}
                            </Button>
                        ) : (
                            <>
                                <Button variant="ghost" onClick={onConfirm} className={cn(variant === 'danger' ? "text-rust hover:text-white hover:bg-rust" : "text-moss hover:bg-moss hover:text-white")}>
                                    {confirmText}
                                </Button>
                                {onCancel && (
                                    <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onCancel} autoFocus>
                                        {cancelText}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </Card>
            </div>
        </>
    );
};
