import type { PortfolioState } from '../types';
import { reconcilePortfolioState } from '../utils/reconcilePortfolioState';
import { resolveUsdAccountBalance, syncUsdAccountFields } from '../utils/usdAccount';

export const PORTFOLIO_PERSIST_VERSION = 5;

export function migratePortfolioState(
    persistedState: unknown,
    version: number,
): PortfolioState {
    const state = persistedState as Record<string, unknown>;

    if (version < 1) {
        const now = new Date().toISOString();
        if (Array.isArray(state.capitalDeposits)) {
            state.capitalDeposits = (state.capitalDeposits as Record<string, unknown>[]).map((d) => ({
                ...d,
                updatedAt: d.updatedAt || d.date || now,
            }));
        }
        if (Array.isArray(state.transactions)) {
            state.transactions = (state.transactions as Record<string, unknown>[]).map((t) => ({
                ...t,
                updatedAt: t.updatedAt || t.date || now,
            }));
        }
        if (Array.isArray(state.holdings)) {
            state.holdings = (state.holdings as Record<string, unknown>[]).map((h) => {
                const purchases = Array.isArray(h.purchases)
                    ? (h.purchases as Record<string, unknown>[]).map((p) => ({
                          ...p,
                          updatedAt: p.updatedAt || p.date || now,
                      }))
                    : h.purchases;
                return {
                    ...h,
                    purchases,
                    updatedAt: h.updatedAt || h.createdAt || now,
                };
            });
        }
        if (Array.isArray(state.customCategories)) {
            state.customCategories = (state.customCategories as Record<string, unknown>[]).map((c) => ({
                ...c,
                updatedAt: c.updatedAt || c.createdAt || now,
            }));
        }
    }

    if (typeof state.masterTwdTotal !== 'number') {
        const deposits = Array.isArray(state.capitalDeposits) ? state.capitalDeposits : [];
        const withdrawals = Array.isArray(state.capitalWithdrawals) ? state.capitalWithdrawals : [];
        const deposited = (deposits as Record<string, unknown>[]).reduce(
            (sum, d) => sum + (Number(d?.amount) || 0),
            0,
        );
        const withdrawn = (withdrawals as Record<string, unknown>[]).reduce(
            (sum, w) => sum + (Number(w?.amount) || 0),
            0,
        );
        state.masterTwdTotal = Math.max(0, deposited - withdrawn);
    }

    if (!Array.isArray(state.capitalWithdrawals)) {
        state.capitalWithdrawals = [];
    }
    if (!Array.isArray(state.pools)) {
        state.pools = [];
    }

    const totalCapitalPool = Number(state.totalCapitalPool);
    if (!Number.isFinite(totalCapitalPool)) {
        state.totalCapitalPool = state.masterTwdTotal;
    } else {
        state.totalCapitalPool = Math.max(0, Math.min(totalCapitalPool, Number(state.masterTwdTotal) || 0));
    }

    Object.assign(state, syncUsdAccountFields(resolveUsdAccountBalance({
        usdAccountCash: Number(state.usdAccountCash) || 0,
        usStockFundPool: Number(state.usStockFundPool) || 0,
    })));

    if (version < 2) {
        if (!('localDataOwnerId' in state)) {
            state.localDataOwnerId = undefined;
        }
        if (!('pendingUpload' in state)) {
            state.pendingUpload = false;
        }
    }

    if (version < 3) {
        Object.assign(state, reconcilePortfolioState(state as unknown as PortfolioState));
    }

    if (version < 4) {
        if (!Array.isArray(state.poolLedger)) {
            state.poolLedger = [];
        }
    }

    if (version < 5) {
        if (typeof state.exchangeRateEUR !== 'number' || (state.exchangeRateEUR as number) <= 0) {
            state.exchangeRateEUR = 34.5;
        }
    }

    return state as unknown as PortfolioState;
}
