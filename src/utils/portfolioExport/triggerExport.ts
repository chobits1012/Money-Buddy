import { usePortfolioStore } from '../../store/portfolioStore';

export type ExcelExportResult =
    | { ok: true; usedShare: boolean }
    | { ok: false; error: string };

/**
 * 產生並分享／下載 Excel 報表。內部動態載入 exceljs 相關模組以維持 code split。
 */
export async function exportPortfolioReportExcel(): Promise<ExcelExportResult> {
    const [{ buildPortfolioReportWorkbook }, { toPortfolioExportState }, { normalizeExcelWriteBuffer }, shareMod] =
        await Promise.all([
            import('./buildWorkbook'),
            import('./snapshot'),
            import('./toArrayBuffer'),
            import('./shareReport'),
        ]);

    const snapshot = toPortfolioExportState(usePortfolioStore.getState());
    const wb = await buildPortfolioReportWorkbook(snapshot);
    const buf = await wb.xlsx.writeBuffer();
    const binary = normalizeExcelWriteBuffer(buf);
    const result = await shareMod.shareOrDownloadExcelBuffer(binary, shareMod.defaultReportFilename());

    if (!result.ok) {
        return { ok: false, error: result.error };
    }
    return { ok: true, usedShare: result.usedShare };
}
