import { describe, expect, it } from 'vitest';
import type { PortfolioState, AssetPool, StockHolding, PoolLedgerEntry, Transaction } from '../types';
import { reconcilePortfolioState } from './reconcilePortfolioState';

const base = (): PortfolioState => ({
    masterTwdTotal: 0,
    totalCapitalPool: 0,
    capitalDeposits: [],
    capitalWithdrawals: [],
    pools: [],
    poolLedger: [],
    usdAccountCash: 0,
    usStockFundPool: 0,
    exchangeRateUSD: 31,
    transactions: [],
    holdings: [],
    customCategories: [],
    isConfigured: true,
    lastSyncedAt: undefined,
    localDataOwnerId: null,
    pendingUpload: false,
});

const makePool = (overrides: Partial<AssetPool> & Pick<AssetPool, 'id'>): AssetPool => ({
    name: '軍團',
    type: 'TAIWAN_STOCK',
    allocatedBudget: 0,
    currentCash: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
});

const makeHolding = (overrides: Partial<StockHolding> & Pick<StockHolding, 'id'>): StockHolding => ({
    type: 'TAIWAN_STOCK',
    name: '台積電',
    purchases: [],
    shares: 0,
    avgPrice: 0,
    totalAmount: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
});

const makeLedger = (overrides: Partial<PoolLedgerEntry>): PoolLedgerEntry => ({
    id: crypto.randomUUID(),
    poolId: 'p1',
    poolName: '軍團',
    marketType: 'TAIWAN_STOCK',
    action: 'POOL_CREATE',
    date: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
});

const makeUsTx = (overrides: Partial<Transaction>): Transaction => ({
    id: crypto.randomUUID(),
    type: 'US_STOCK',
    amount: 0,
    date: '2026-01-01',
    note: '',
    action: 'DEPOSIT',
    ...overrides,
});

describe('reconcilePortfolioState', () => {
    // ═══ 原有測試 ═══

    it('recomputes totalCapitalPool from deposits and pools', () => {
        const s = base();
        s.capitalDeposits = [
            { id: 'd1', amount: 200_000_000, note: '', date: '2026-01-01', updatedAt: '2026-01-01' },
        ];
        s.pools = [makePool({ id: 'p1', allocatedBudget: 50_000_000, currentCash: 50_000_000 })];
        s.totalCapitalPool = 200_000_000;
        s.masterTwdTotal = 200_000_000;

        const r = reconcilePortfolioState(s);
        expect(r.masterTwdTotal).toBe(200_000_000);
        expect(r.totalCapitalPool).toBe(150_000_000);
    });

    // ═══ Pool currentCash 封閉公式 ═══

    describe('pool currentCash closed-form', () => {
        it('currentCash = allocatedBudget − invested for TWD pool', () => {
            const s = base();
            s.capitalDeposits = [{ id: 'd1', amount: 200_000, note: '', date: '2026-01-01' }];
            s.pools = [makePool({ id: 'p1', allocatedBudget: 100_000, currentCash: 999_999 })];
            s.holdings = [
                makeHolding({ id: 'h1', poolId: 'p1', totalAmount: 60_000 }),
            ];

            const r = reconcilePortfolioState(s);
            const pool = r.pools!.find((p) => p.id === 'p1')!;
            expect(pool.currentCash).toBe(40_000);
        });

        it('currentCash = allocatedBudget − invested for USD pool', () => {
            const s = base();
            s.pools = [makePool({ id: 'p1', type: 'US_STOCK', allocatedBudget: 500, currentCash: 999 })];
            s.holdings = [
                makeHolding({ id: 'h1', type: 'US_STOCK', poolId: 'p1', totalAmountUSD: 300 }),
            ];

            const r = reconcilePortfolioState(s);
            const pool = r.pools!.find((p) => p.id === 'p1')!;
            expect(pool.currentCash).toBe(200);
        });

        it('currentCash floors at 0 when invested > allocatedBudget', () => {
            const s = base();
            s.pools = [makePool({ id: 'p1', allocatedBudget: 50_000, currentCash: 0 })];
            s.holdings = [
                makeHolding({ id: 'h1', poolId: 'p1', totalAmount: 80_000 }),
            ];

            const r = reconcilePortfolioState(s);
            expect(r.pools!.find((p) => p.id === 'p1')!.currentCash).toBe(0);
        });

        it('empty pool → currentCash = allocatedBudget', () => {
            const s = base();
            s.pools = [makePool({ id: 'p1', allocatedBudget: 100_000, currentCash: 0 })];

            const r = reconcilePortfolioState(s);
            expect(r.pools!.find((p) => p.id === 'p1')!.currentCash).toBe(100_000);
        });
    });

    // ═══ Pool allocatedBudget 從 ledger 重算 ═══

    describe('pool allocatedBudget from ledger', () => {
        it('recomputes from CREATE + ALLOCATE − WITHDRAW + holding PnL', () => {
            const s = base();
            s.capitalDeposits = [{ id: 'd1', amount: 500_000, note: '', date: '2026-01-01' }];
            s.pools = [makePool({ id: 'p1', allocatedBudget: 999_999, currentCash: 0 })];
            s.poolLedger = [
                makeLedger({ poolId: 'p1', action: 'POOL_CREATE', amountTWD: 80_000 }),
                makeLedger({ poolId: 'p1', action: 'POOL_ALLOCATE', amountTWD: 20_000 }),
                makeLedger({ poolId: 'p1', action: 'POOL_WITHDRAW', amountTWD: 10_000 }),
            ];
            s.holdings = [
                makeHolding({ id: 'h1', poolId: 'p1', totalAmount: 50_000, realizedPnL: -3_000 }),
            ];

            const r = reconcilePortfolioState(s);
            const pool = r.pools!.find((p) => p.id === 'p1')!;
            // base = 80k + 20k − 10k = 90k, pnl = −3k → 87k
            expect(pool.allocatedBudget).toBe(87_000);
            // currentCash = 87k − 50k = 37k
            expect(pool.currentCash).toBe(37_000);
        });

        it('falls back to existing value when no ledger entries', () => {
            const s = base();
            s.pools = [makePool({ id: 'p1', allocatedBudget: 100_000, currentCash: 0 })];
            s.poolLedger = [];

            const r = reconcilePortfolioState(s);
            expect(r.pools!.find((p) => p.id === 'p1')!.allocatedBudget).toBe(100_000);
        });

        it('USD pool: uses amountUSD from ledger', () => {
            const s = base();
            s.pools = [makePool({ id: 'p1', type: 'US_STOCK', allocatedBudget: 999, currentCash: 0 })];
            s.poolLedger = [
                makeLedger({ poolId: 'p1', marketType: 'US_STOCK', action: 'POOL_CREATE', amountUSD: 1000 }),
                makeLedger({ poolId: 'p1', marketType: 'US_STOCK', action: 'POOL_ALLOCATE', amountUSD: 500 }),
            ];

            const r = reconcilePortfolioState(s);
            expect(r.pools!.find((p) => p.id === 'p1')!.allocatedBudget).toBe(1500);
        });
    });

    // ═══ USD 封閉公式 ═══

    describe('USD closed-form from transactions', () => {
        it('recomputes from US_STOCK DEPOSIT/WITHDRAWAL + holding PnL', () => {
            const s = base();
            s.transactions = [
                makeUsTx({ action: 'DEPOSIT', amountUSD: 1000 }),
                makeUsTx({ action: 'DEPOSIT', amountUSD: 500 }),
                makeUsTx({ action: 'WITHDRAWAL', amountUSD: 200 }),
            ];
            s.holdings = [
                makeHolding({ id: 'h1', type: 'US_STOCK', realizedPnL: -50 }),
            ];
            s.usdAccountCash = 9999; // should be overridden

            const r = reconcilePortfolioState(s);
            // 1000 + 500 − 200 + (−50) = 1250
            expect(r.usdAccountCash).toBe(1250);
            expect(r.usStockFundPool).toBe(1250);
        });

        it('does NOT inflate when hint is higher than computed', () => {
            const s = base();
            s.transactions = [makeUsTx({ action: 'DEPOSIT', amountUSD: 500 })];
            s.usdAccountCash = 5000; // inflated
            s.usStockFundPool = 5000;

            const r = reconcilePortfolioState(s, { usdBaseHint: 5000 });
            expect(r.usdAccountCash).toBe(500); // computed, not hint
        });

        it('legacy fallback: uses hint when no US_STOCK transactions', () => {
            const s = base();
            s.usdAccountCash = 300;
            s.usStockFundPool = 300;

            const r = reconcilePortfolioState(s, { usdBaseHint: 250 });
            expect(r.usdAccountCash).toBe(250);
        });

        it('legacy fallback: uses fromState when no hint and no transactions', () => {
            const s = base();
            s.usdAccountCash = 100;
            s.usStockFundPool = 200;

            const r = reconcilePortfolioState(s);
            expect(r.usdAccountCash).toBe(200); // max(100, 200)
        });
    });

    // ═══ 膨脹防護（診斷報告的核心場景） ═══

    describe('inflation protection', () => {
        it('台股 Pool 內持倉：刪除後 reconcile 矯正 currentCash（路徑 A）', () => {
            const s = base();
            s.capitalDeposits = [{ id: 'd1', amount: 200_000, note: '', date: '2026-01-01' }];
            s.poolLedger = [
                makeLedger({ poolId: 'p1', action: 'POOL_CREATE', amountTWD: 100_000 }),
            ];
            s.pools = [makePool({ id: 'p1', allocatedBudget: 100_000, currentCash: 10_000 })];
            s.holdings = [
                makeHolding({ id: 'h1', poolId: 'p1', totalAmount: 50_000, realizedPnL: 0 }),
            ];

            // 模擬刪除 holding A → cashDelta = 50,000 加到 currentCash
            // removeHolding 會把 currentCash 從 10,000 膨脹到 60,000
            s.pools[0].currentCash = 60_000; // 被刪除退款膨脹的值

            // 同步後 holding 復活，reconcile 應矯正
            const r = reconcilePortfolioState(s);
            const pool = r.pools!.find((p) => p.id === 'p1')!;
            // allocatedBudget from ledger = 100k + 0 pnl = 100k
            expect(pool.allocatedBudget).toBe(100_000);
            // currentCash = 100k − 50k = 50k（正確值，不是 60k）
            expect(pool.currentCash).toBe(50_000);
        });

        it('台股 Pool 內持倉：反覆刪除不累積膨脹', () => {
            const s = base();
            s.capitalDeposits = [{ id: 'd1', amount: 500_000, note: '', date: '2026-01-01' }];
            s.poolLedger = [
                makeLedger({ poolId: 'p1', action: 'POOL_CREATE', amountTWD: 100_000 }),
            ];
            s.pools = [makePool({ id: 'p1', allocatedBudget: 100_000, currentCash: 100_000 })];
            s.holdings = [
                makeHolding({ id: 'h1', poolId: 'p1', totalAmount: 50_000, realizedPnL: 0 }),
            ];

            // 模擬 5 次刪除→復活循環，每次 cashDelta = +50,000
            s.pools[0].currentCash = 100_000 + 50_000 * 5; // 350,000 (嚴重膨脹)
            s.pools[0].allocatedBudget = 100_000; // pnl=0 所以 allocatedBudget 不變

            const r = reconcilePortfolioState(s);
            const pool = r.pools!.find((p) => p.id === 'p1')!;
            expect(pool.allocatedBudget).toBe(100_000);
            expect(pool.currentCash).toBe(50_000); // 正確值，膨脹完全消除
        });

        it('USD 持倉：removeHolding 的 pnlDelta 膨脹被矯正（路徑 B）', () => {
            const s = base();
            s.transactions = [makeUsTx({ action: 'DEPOSIT', amountUSD: 1000 })];
            s.holdings = [
                makeHolding({
                    id: 'h1',
                    type: 'US_STOCK',
                    totalAmountUSD: 800,
                    realizedPnL: -50,
                }),
            ];
            // 模擬刪除後 pnlDelta = +50 → usdAccountCash 膨脹
            s.usdAccountCash = 1050;
            s.usStockFundPool = 1050;

            // 同步後 holding 復活，reconcile 應矯正
            const r = reconcilePortfolioState(s);
            // 1000 (deposit) + (-50) (pnl) = 950
            expect(r.usdAccountCash).toBe(950);
        });

        it('非 Pool 台股：totalCapitalPool 封閉公式本來就能矯正（路徑 C 不受影響）', () => {
            const s = base();
            s.capitalDeposits = [{ id: 'd1', amount: 200_000, note: '', date: '2026-01-01' }];
            s.holdings = [
                makeHolding({ id: 'h1', totalAmount: 30_000 }),
            ];
            s.totalCapitalPool = 999_999; // 被膨脹的值

            const r = reconcilePortfolioState(s);
            // 200k − 0 (no pools) − 30k − 0 (no custom) = 170k
            expect(r.totalCapitalPool).toBe(170_000);
        });
    });

    // ═══ totalCapitalPool 使用 reconciled pool 值 ═══

    describe('totalCapitalPool uses reconciled pool allocatedBudget', () => {
        it('uses ledger-based allocatedBudget instead of inflated value', () => {
            const s = base();
            s.capitalDeposits = [{ id: 'd1', amount: 300_000, note: '', date: '2026-01-01' }];
            s.poolLedger = [
                makeLedger({ poolId: 'p1', action: 'POOL_CREATE', amountTWD: 80_000 }),
            ];
            // allocatedBudget was inflated by repeated removeHolding pnlDelta
            s.pools = [makePool({ id: 'p1', allocatedBudget: 120_000, currentCash: 0 })];

            const r = reconcilePortfolioState(s);
            // ledger says 80k, not 120k
            expect(r.pools![0].allocatedBudget).toBe(80_000);
            // totalCapitalPool = 300k − 80k − 0 − 0 = 220k
            expect(r.totalCapitalPool).toBe(220_000);
        });
    });
});
