import { useState } from 'react';
import { usePortfolioStore } from './store/portfolioStore';
import { WelcomeSetup } from './components/setup/WelcomeSetup';
import { Dashboard } from './components/dashboard/Dashboard';
import { PetDashboard } from './components/pet-dashboard/PetDashboard';
import { DepositDrawer } from './components/dashboard/DepositDrawer';
import { WithdrawalDrawer } from './components/dashboard/WithdrawalDrawer';
import { isPetDashboardEnabled } from './utils/featureFlags';
import { useHomeViewMode } from './hooks/useHomeViewMode';

export default function App() {
    const isConfigured = usePortfolioStore((state) => state.isConfigured);
    const addCapitalDeposit = usePortfolioStore((state) => state.addCapitalDeposit);
    const addCapitalWithdrawal = usePortfolioStore((state) => state.addCapitalWithdrawal);
    const petDashboardEnabled = isPetDashboardEnabled();
    const [viewMode, setViewMode] = useHomeViewMode();

    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);

    // 根據是否已經完成了初始設定，決定顯示歡迎設定頁或主要儀表板
    if (!isConfigured) {
        return <WelcomeSetup />;
    }

    const showPetView = petDashboardEnabled && viewMode === 'pet';

    return (
        <>
            {showPetView ? (
                <PetDashboard
                    onOpenDeposit={() => setIsDepositOpen(true)}
                    onOpenWithdrawal={() => setIsWithdrawalOpen(true)}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />
            ) : (
                <Dashboard
                    onOpenDeposit={() => setIsDepositOpen(true)}
                    onOpenWithdrawal={() => setIsWithdrawalOpen(true)}
                    petDashboardEnabled={petDashboardEnabled}
                    viewMode={viewMode}
                    onViewModeChange={petDashboardEnabled ? setViewMode : undefined}
                />
            )}

            <DepositDrawer
                isOpen={isDepositOpen}
                onClose={() => setIsDepositOpen(false)}
                onSubmit={(amount, note) => addCapitalDeposit({ amount, note })}
            />

            <WithdrawalDrawer
                isOpen={isWithdrawalOpen}
                onClose={() => setIsWithdrawalOpen(false)}
                onSubmit={(amount, note) => addCapitalWithdrawal({ amount, note })}
            />
        </>
    );
}
