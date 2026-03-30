import { describe, expect, it } from 'vitest';
import type { PortfolioState } from '../types';
import {
    buildStateForSyncUpload,
    prepareStateForSyncUpload,
} from './syncServerPipeline';

describe('sync server merge pipeline (logic only)', () => {
    it('when cloud missing, keeps local and sets owner', () => {
        const local: PortfolioState = {
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
            lastSyncedAt: '2026-01-01T00:00:00.000Z',
            localDataOwnerId: null,
            pendingUpload: false,
        };
        const out = prepareStateForSyncUpload(local, null, 'uid-1');
        expect(out.localDataOwnerId).toBe('uid-1');
        expect(out.holdings).toEqual([]);
    });

    it('when cloud exists, uses syncMerge', () => {
        const local: PortfolioState = {
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
            lastSyncedAt: '2026-01-01T00:00:00.000Z',
            localDataOwnerId: null,
            pendingUpload: false,
        };

        const cloud = {
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
            lastSyncedAt: '2026-02-01T00:00:00.000Z',
        } as PortfolioState;

        const out = prepareStateForSyncUpload(local, cloud, 'uid-1');
        expect(out.localDataOwnerId).toBe('uid-1');
        expect(out.lastSyncedAt).toBeDefined();
    });

    it('reads the latest local state after cloud fetch resolves', async () => {
        let local: PortfolioState = {
            masterTwdTotal: 100_000,
            totalCapitalPool: 50_000,
            capitalDeposits: [
                {
                    id: 'd1',
                    amount: 100_000,
                    note: '',
                    date: '2026-01-01',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ],
            capitalWithdrawals: [],
            pools: [],
            poolLedger: [],
            usdAccountCash: 0,
            usStockFundPool: 0,
            exchangeRateUSD: 31,
            transactions: [],
            holdings: [
                {
                    id: 'h1',
                    type: 'TAIWAN_STOCK',
                    name: '2330',
                    purchases: [],
                    shares: 100,
                    avgPrice: 500,
                    totalAmount: 50_000,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-03-30T10:00:00.000Z',
                },
            ],
            customCategories: [],
            isConfigured: true,
            lastSyncedAt: '2026-03-30T10:00:00.000Z',
            localDataOwnerId: null,
            pendingUpload: false,
        };

        const out = await buildStateForSyncUpload(
            () => local,
            async () => {
                local = {
                    ...local,
                    holdings: local.holdings.map((holding) =>
                        holding.id === 'h1'
                            ? {
                                  ...holding,
                                  deletedAt: '2026-03-30T10:00:02.000Z',
                                  updatedAt: '2026-03-30T10:00:02.000Z',
                              }
                            : holding,
                    ),
                };

                return {
                    ...local,
                    holdings: [
                        {
                            id: 'h1',
                            type: 'TAIWAN_STOCK',
                            name: '2330',
                            purchases: [],
                            shares: 100,
                            avgPrice: 500,
                            totalAmount: 50_000,
                            createdAt: '2026-01-01T00:00:00.000Z',
                            updatedAt: '2026-03-30T10:00:01.000Z',
                        },
                    ],
                    lastSyncedAt: '2026-03-30T10:00:01.000Z',
                };
            },
            'uid-1',
        );

        expect(out.holdings.find((holding) => holding.id === 'h1')?.deletedAt)
            .toBe('2026-03-30T10:00:02.000Z');
    });
});
