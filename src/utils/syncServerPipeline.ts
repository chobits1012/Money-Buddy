import type { PortfolioState } from '../types';
import { reconcilePortfolioState } from './reconcilePortfolioState';
import { syncMerge } from './syncMerge';

export function prepareStateForSyncUpload(
    localState: PortfolioState,
    cloudState: PortfolioState | null,
    ownerId: string,
): PortfolioState {
    const merged = cloudState
        ? syncMerge(localState, cloudState)
        : {
              ...localState,
              ...reconcilePortfolioState(localState),
          };

    return {
        ...merged,
        localDataOwnerId: ownerId,
    };
}

export async function buildStateForSyncUpload(
    getLocalState: () => PortfolioState,
    fetchCloudState: () => Promise<PortfolioState | null>,
    ownerId: string,
): Promise<PortfolioState> {
    const cloudState = await fetchCloudState();
    const localState = getLocalState();

    return prepareStateForSyncUpload(localState, cloudState, ownerId);
}
