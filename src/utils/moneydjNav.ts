/** Client-safe MoneyDJ helpers（完整實作見 api/lib/moneydjNav.ts） */

export type FundNavScope = 'domestic' | 'offshore';

export function scopeFromExchDisp(exchDisp?: string): FundNavScope {
    return exchDisp === 'Global Fund' ? 'offshore' : 'domestic';
}
