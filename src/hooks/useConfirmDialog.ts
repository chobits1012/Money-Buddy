import { useCallback, useState } from 'react';

export interface ConfirmDialogRequest {
    title: string;
    message: string;
    action: () => void;
    requireText?: string;
    confirmText?: string;
    cancelText?: string;
}

/** 共用刪除／重設等確認彈窗的狀態與 props */
export function useConfirmDialog(defaultConfirmText = '確認') {
    const [request, setRequest] = useState<ConfirmDialogRequest | null>(null);

    const ask = useCallback((options: ConfirmDialogRequest) => {
        setRequest(options);
    }, []);

    const dismiss = useCallback(() => {
        setRequest(null);
    }, []);

    const confirm = useCallback(() => {
        if (!request) return;
        request.action();
        setRequest(null);
    }, [request]);

    return {
        ask,
        dismiss,
        modalProps: {
            isOpen: !!request,
            title: request?.title ?? '',
            message: request?.message ?? '',
            requireText: request?.requireText,
            confirmText: request?.confirmText ?? defaultConfirmText,
            cancelText: request?.cancelText,
            onConfirm: confirm,
            onCancel: dismiss,
        },
    };
}
