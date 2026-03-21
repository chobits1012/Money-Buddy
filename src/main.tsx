import { bootstrapPersistSuffix } from './utils/persistUserStorage';
import { usePortfolioStore } from './store/portfolioStore';

void bootstrapPersistSuffix().then(() => {
    usePortfolioStore.persist.rehydrate();
    void import('./main-app').then(({ renderApp }) => {
        renderApp();
    });
});
