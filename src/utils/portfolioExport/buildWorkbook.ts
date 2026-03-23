import ExcelJS from 'exceljs';
import type { AssetType, PortfolioState, StockHolding } from '../../types';
import { ASSET_LABELS } from '../constants';
import { buildDashboardAllocationView } from '../dashboardMetrics';
import { buildReportLedgerRows } from './reportLedger';

const SHEET_OVERVIEW = '總覽';
const SHEET_ALLOCATION = '資產配置';
const SHEET_HOLDINGS = '持倉明細';
const SHEET_LEDGER = '交易流水';

function setHeaderRow(row: ExcelJS.Row) {
    row.font = { bold: true };
    row.alignment = { vertical: 'middle', wrapText: true };
}

function autosizeColumns(worksheet: ExcelJS.Worksheet, min = 10, max = 42) {
    worksheet.columns?.forEach((col) => {
        let maxLen = min;
        col.eachCell?.({ includeEmpty: false }, (cell) => {
            const v = cell.value;
            const s = v == null ? '' : typeof v === 'object' && 'text' in (v as object) ? String((v as { text: string }).text) : String(v);
            maxLen = Math.min(max, Math.max(maxLen, Math.ceil(s.length * 1.1)));
        });
        col.width = maxLen;
    });
}

function poolLabel(state: PortfolioState, holding: StockHolding): string {
    if (!holding.poolId) return '—';
    return state.pools.find((p) => p.id === holding.poolId)?.name ?? holding.poolId;
}

function holdingRows(state: PortfolioState): (string | number | null)[][] {
    const rate = Number(state.exchangeRateUSD) > 0 ? Number(state.exchangeRateUSD) : 31;
    return (state.holdings ?? []).map((h) => {
        const isUs = h.type === 'US_STOCK';
        const costTwd = Math.round(h.totalAmount || 0);
        const costUsd =
            h.totalAmountUSD != null && Number.isFinite(h.totalAmountUSD)
                ? Number(h.totalAmountUSD.toFixed(2))
                : null;
        const avgUsd = isUs ? h.avgPrice : null;
        const avgTwd = !isUs ? h.avgPrice : h.shares > 0 ? Math.round((costTwd / h.shares) * 100) / 100 : null;
        const approxAvgUsdTwd =
            isUs && avgUsd != null ? Math.round(avgUsd * rate * 100) / 100 : null;

        return [
            ASSET_LABELS[h.type] || h.type,
            h.name,
            h.symbol ?? '—',
            poolLabel(state, h),
            h.shares,
            isUs ? (avgUsd ?? '—') : '—',
            isUs ? (avgTwd ?? approxAvgUsdTwd ?? '—') : (avgTwd ?? '—'),
            isUs ? (costUsd ?? '—') : '—',
            costTwd,
            isUs ? rate : '—',
            h.unrealizedPnL != null
                ? isUs
                    ? Number((h.unrealizedPnL * rate).toFixed(0))
                    : h.unrealizedPnL
                : '—',
            h.realizedPnL != null
                ? isUs
                    ? Number((h.realizedPnL * rate).toFixed(0))
                    : h.realizedPnL
                : '—',
        ];
    });
}

/**
 * 產出多工作表理財報表（與儀表板相同之主帳台幣邏輯；美股附美元與台幣約當）。
 */
export async function buildPortfolioReportWorkbook(state: PortfolioState): Promise<ExcelJS.Workbook> {
    const view = buildDashboardAllocationView({
        masterTwdTotal: state.masterTwdTotal,
        capitalDeposits: state.capitalDeposits,
        capitalWithdrawals: state.capitalWithdrawals,
        totalCapitalPool: state.totalCapitalPool,
        pools: state.pools,
        usdAccountCash: state.usdAccountCash,
        usStockFundPool: state.usStockFundPool,
        exchangeRateUSD: state.exchangeRateUSD,
        holdings: state.holdings,
        customCategories: state.customCategories,
    });

    const master = view.masterCapitalTotal;
    const rate = Number(state.exchangeRateUSD) > 0 ? Number(state.exchangeRateUSD) : 31;
    const exportedAt = new Date().toISOString();

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Portfolio Tracker';
    wb.created = new Date();

    // ─── 總覽 ───
    const ws0 = wb.addWorksheet(SHEET_OVERVIEW);
    ws0.addRow(['項目', '數值']);
    setHeaderRow(ws0.getRow(1));
    const overviewPairs: [string, string | number][] = [
        ['匯出時間 (UTC)', exportedAt],
        ['美金兌台幣匯率（設定值）', rate],
        ['主帳戶淨入金總額 (TWD)', master],
        ['已配置資金 (TWD)', view.allocatedCapital],
        ['已配置比例 (%)', Number(view.allocatedPercentage.toFixed(2))],
        ['閒置資金 (TWD)', view.idleCapital],
        ['美股美元帳戶餘額 (USD)', Math.max(state.usdAccountCash || 0, state.usStockFundPool || 0)],
        ['最後同步時間', state.lastSyncedAt ?? '—'],
    ];
    overviewPairs.forEach(([k, v]) => ws0.addRow([k, v]));
    ws0.getColumn(1).width = 28;
    ws0.getColumn(2).width = 36;

    // ─── 資產配置 ───
    const ws1 = wb.addWorksheet(SHEET_ALLOCATION);
    ws1.addRow(['分類', '金額 (TWD)', '占主帳比例 (%)']);
    setHeaderRow(ws1.getRow(1));

    const assetTypes: AssetType[] = ['TAIWAN_STOCK', 'US_STOCK', 'FUNDS', 'CRYPTO'];
    for (const t of assetTypes) {
        const amt = view.assetTotals[t] ?? 0;
        const pct = master > 0 ? Number(((amt / master) * 100).toFixed(2)) : 0;
        ws1.addRow([ASSET_LABELS[t], amt, pct]);
    }

    for (const c of view.customCategories) {
        const pct = master > 0 ? Number(((c.amount / master) * 100).toFixed(2)) : 0;
        ws1.addRow([`自訂：${c.name}`, c.amount, pct]);
    }

    const idlePct = master > 0 ? Number(((view.idleCapital / master) * 100).toFixed(2)) : 0;
    ws1.addRow(['閒置資金', view.idleCapital, idlePct]);
    autosizeColumns(ws1);

    // ─── 持倉明細 ───
    const ws2 = wb.addWorksheet(SHEET_HOLDINGS);
    ws2.addRow([
        '市場',
        '標的名稱',
        '代號',
        '入金池',
        '持股數量',
        '均價 (USD，美股)',
        '均價 (台幣／約當)',
        '總成本 (USD，美股)',
        '總成本 (台幣／約當)',
        '匯率參考 (美股)',
        '未實現損益 (TWD)',
        '已實現損益 (TWD)',
    ]);
    setHeaderRow(ws2.getRow(1));
    holdingRows(state).forEach((r) => ws2.addRow(r));
    autosizeColumns(ws2);

    // ─── 交易流水 ───
    const ws3 = wb.addWorksheet(SHEET_LEDGER);
    ws3.addRow([
        '時間',
        '動作類型',
        '說明',
        '美元 (原幣)',
        '台幣 (約當／本位)',
        '匯率 (USD→TWD)',
    ]);
    setHeaderRow(ws3.getRow(1));

    const ledger = buildReportLedgerRows(state);
    for (const r of ledger) {
        const when = new Date(r.occurredAt);
        const localStr = Number.isFinite(when.getTime())
            ? when.toLocaleString('zh-TW', { hour12: false })
            : r.occurredAt;
        ws3.addRow([
            localStr,
            r.categoryZh,
            r.description,
            r.usdAmount != null ? Number(r.usdAmount.toFixed(2)) : '—',
            r.twdAmount != null ? r.twdAmount : '—',
            r.exchangeRate != null ? Number(r.exchangeRate.toFixed(4)) : '—',
        ]);
    }
    autosizeColumns(ws3);

    return wb;
}
