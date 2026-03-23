const XLSX_MIME =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type ShareReportResult = { ok: true; usedShare: boolean } | { ok: false; error: string };

function triggerDownload(buffer: ArrayBuffer, filename: string) {
    const blob = new Blob([buffer], { type: XLSX_MIME });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/**
 * 優先使用 Web Share API（手機 PWA 可分享到 LINE／檔案），失敗則下載。
 */
export async function shareOrDownloadExcelBuffer(
    buffer: ArrayBuffer,
    filename: string,
): Promise<ShareReportResult> {
    const blob = new Blob([buffer], { type: XLSX_MIME });
    const file = new File([blob], filename, { type: XLSX_MIME });

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        const payload: ShareData & { files?: File[] } = {
            files: [file],
            title: '理財報表',
            text: '個人理財匯出報表',
        };
        const can =
            typeof navigator.canShare === 'function' ? navigator.canShare(payload) : true;
        if (can) {
            try {
                await navigator.share(payload);
                return { ok: true, usedShare: true };
            } catch (e) {
                if (e instanceof DOMException && e.name === 'AbortError') {
                    return { ok: false, error: '已取消分享' };
                }
                // 其餘錯誤改以下載
            }
        }
    }

    try {
        triggerDownload(buffer, filename);
        return { ok: true, usedShare: false };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: msg };
    }
}

export function defaultReportFilename(): string {
    const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    return `理財報表-${stamp}.xlsx`;
}
