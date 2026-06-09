import { bootstrapPersistSuffix } from './utils/persistUserStorage';
import { reconcilePortfolioState } from './utils/reconcilePortfolioState';
import { usePortfolioStore } from './store/portfolioStore';
import type { PortfolioState } from './types';

void bootstrapPersistSuffix().then(async () => {
    await usePortfolioStore.persist.rehydrate();
    const snapshot = usePortfolioStore.getState() as PortfolioState;
    usePortfolioStore.setState(reconcilePortfolioState(snapshot));
    const { renderApp } = await import('./main-app');
    renderApp();
});
