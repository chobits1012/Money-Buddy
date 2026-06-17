import { bootstrapPersistSuffix } from './utils/persistUserStorage';
import { reconcilePortfolioState } from './utils/reconcilePortfolioState';
import { mergeDuplicateHoldingsInState } from './utils/mergeDuplicateHoldings';
import { usePortfolioStore } from './store/portfolioStore';
import type { PortfolioState } from './types';

void bootstrapPersistSuffix().then(async () => {
    await usePortfolioStore.persist.rehydrate();
    const snapshot = usePortfolioStore.getState() as PortfolioState;
    const merged = mergeDuplicateHoldingsInState(snapshot);
    const mergedState: PortfolioState = { ...snapshot, ...merged };
    usePortfolioStore.setState({
        ...merged,
        ...reconcilePortfolioState(mergedState),
    });
    const { renderApp } = await import('./main-app');
    renderApp();
});
