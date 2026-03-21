import { bootstrapPersistSuffix } from './utils/persistUserStorage';
import { reconcilePortfolioState } from './utils/reconcilePortfolioState';
import { usePortfolioStore } from './store/portfolioStore';
import type { PortfolioState } from './types';

void bootstrapPersistSuffix().then(() => {
    usePortfolioStore.persist.rehydrate();
    const snapshot = usePortfolioStore.getState() as PortfolioState;
    usePortfolioStore.setState(reconcilePortfolioState(snapshot));
    void import('./main-app').then(({ renderApp }) => {
        renderApp();
    });
});
