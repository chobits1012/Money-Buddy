import type { PortfolioState, PoolLedgerEntry, StockHolding } from '../../types';
import { ASSET_LABELS } from '../constants';

export type ReportLedgerCategoryZh =
    | '入金'
    | '出金'
    | '買入'
    | '賣出'
    | '內部調撥'
    | '建立入金池'
    | '移除入金池';

export interface ReportLedgerRow {
    id: string;
    occurredAt: string;
    timestamp: number;
    categoryZh: ReportLedgerCategoryZh;
    description: string;
    /** 與事件直接相關之美元金額（無則空） */
    usdAmount: number | null;
    /** 台幣約當／台幣本位金額；內部調撥若僅單幣別則另一幣為 null */
    twdAmount: number | null;
    /** 匯率（USD→TWD）；有美元金額且可推算時填入 */
    exchangeRate: number | null;
}

function ts(iso?: string): number {
    if (!iso) return 0;
    const n = new Date(iso).getTime();
    return Number.isFinite(n) ? n : 0;
}

function pickTime(...candidates: (string | undefined)[]): string {
    for (const c of candidates) {
        if (c && ts(c) > 0) return c;
    }
    return new Date().toISOString();
}

function poolCategory(entry: PoolLedgerEntry): ReportLedgerCategoryZh {
    switch (entry.action) {
        case 'POOL_CREATE':
            return '建立入金池';
        case 'POOL_REMOVE':
            return '移除入金池';
        default:
            return '內部調撥';
    }
}

function poolRow(entry: PoolLedgerEntry, exchangeRateUSD: number): ReportLedgerRow {
    const categoryZh = poolCategory(entry);
    const usd =
        entry.amountUSD != null && Number.isFinite(entry.amountUSD) ? entry.amountUSD : null;
    const twdDirect =
        entry.amountTWD != null && Number.isFinite(entry.amountTWD) ? entry.amountTWD : null;
    let twdAmount: number | null = twdDirect;
    const usdAmount: number | null = usd;
    let exchangeRate: number | null = null;

    if (usd != null && exchangeRateUSD > 0) {
        exchangeRate = exchangeRateUSD;
        if (twdAmount == null) {
            twdAmount = Math.round(usd * exchangeRateUSD);
        }
    } else if (twdDirect != null) {
        twdAmount = Math.round(twdDirect);
    }

    return {
        id: entry.id,
        occurredAt: pickTime(entry.date, entry.updatedAt),
        timestamp: ts(pickTime(entry.date, entry.updatedAt)),
        categoryZh,
        description: entry.note || `${ASSET_LABELS[entry.marketType]} · ${entry.poolName}`,
        usdAmount,
        twdAmount,
        exchangeRate,
    };
}

function poolNameForHolding(state: PortfolioState, holding: StockHolding): string {
    if (!holding.poolId) return '（未分配／主帳）';
    const p = state.pools.find((x) => x.id === holding.poolId);
    return p ? p.name : holding.poolId;
}

/**
 * 合併主帳、市場資金異動、買賣紀錄、入金池流水，依時間新→舊排序。
 */
export function buildReportLedgerRows(state: PortfolioState): ReportLedgerRow[] {
    const exchangeRateUSD = Number(state.exchangeRateUSD) > 0 ? Number(state.exchangeRateUSD) : 31;
    const rows: ReportLedgerRow[] = [];

    for (const d of state.capitalDeposits ?? []) {
        const when = pickTime(d.updatedAt, d.date);
        rows.push({
            id: `cap-dep-${d.id}`,
            occurredAt: when,
            timestamp: ts(when),
            categoryZh: '入金',
            description: d.note || '主帳戶入金',
            usdAmount: null,
            twdAmount: d.amount,
            exchangeRate: null,
        });
    }

    for (const w of state.capitalWithdrawals ?? []) {
        const when = pickTime(w.updatedAt, w.date);
        rows.push({
            id: `cap-wdr-${w.id}`,
            occurredAt: when,
            timestamp: ts(when),
            categoryZh: '出金',
            description: w.note || '主帳戶提領',
            usdAmount: null,
            twdAmount: -w.amount,
            exchangeRate: null,
        });
    }

    for (const tx of state.transactions ?? []) {
        const when = pickTime(tx.updatedAt, tx.date);
        const market = ASSET_LABELS[tx.type] || tx.type;
        const isUs = tx.type === 'US_STOCK';
        const sign = tx.action === 'DEPOSIT' ? 1 : -1;
        const twdLeg = sign * (tx.amount || 0);
        const usdLeg =
            tx.amountUSD != null && Number.isFinite(tx.amountUSD) ? sign * tx.amountUSD : null;
        const rate =
            tx.exchangeRate != null && Number.isFinite(tx.exchangeRate)
                ? tx.exchangeRate
                : usdLeg != null && Math.abs(usdLeg) > 1e-9
                  ? Math.abs(twdLeg / usdLeg)
                  : null;

        rows.push({
            id: `tx-${tx.id}`,
            occurredAt: when,
            timestamp: ts(when),
            categoryZh: tx.action === 'DEPOSIT' ? '入金' : '出金',
            description: `${market}資金${tx.action === 'DEPOSIT' ? '投入' : '撤出'}${tx.note ? ` · ${tx.note}` : ''}`,
            usdAmount: isUs ? usdLeg : null,
            twdAmount: Math.round(twdLeg),
            exchangeRate: isUs ? rate : null,
        });
    }

    for (const h of state.holdings ?? []) {
        const poolLabel = poolNameForHolding(state, h);
        const isUs = h.type === 'US_STOCK';
        for (const p of h.purchases ?? []) {
            const when = pickTime(p.updatedAt, p.date);
            const side = p.action === 'SELL' ? '賣出' : '買入';
            const categoryZh: ReportLedgerCategoryZh = side === '買入' ? '買入' : '賣出';
            const sign = p.action === 'SELL' ? -1 : 1;
            const twdLeg = sign * (p.totalCost || 0);
            const usdLeg =
                p.totalCostUSD != null && Number.isFinite(p.totalCostUSD)
                    ? sign * p.totalCostUSD
                    : null;
            const rate =
                p.exchangeRate != null && Number.isFinite(p.exchangeRate)
                    ? p.exchangeRate
                    : usdLeg != null && Math.abs(usdLeg) > 1e-9
                      ? Math.abs(twdLeg / usdLeg)
                      : isUs && usdLeg != null
                        ? exchangeRateUSD
                        : null;

            const symbolPart = h.symbol ? ` (${h.symbol})` : '';
            rows.push({
                id: `pur-${h.id}-${p.id}`,
                occurredAt: when,
                timestamp: ts(when),
                categoryZh,
                description: `${h.name}${symbolPart} · ${poolLabel}${p.note ? ` · ${p.note}` : ''}`,
                usdAmount: isUs ? usdLeg : null,
                twdAmount: Math.round(twdLeg),
                exchangeRate: isUs ? rate : null,
            });
        }
    }

    for (const e of state.poolLedger ?? []) {
        rows.push(poolRow(e, exchangeRateUSD));
    }

    rows.sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id));
    return rows;
}
