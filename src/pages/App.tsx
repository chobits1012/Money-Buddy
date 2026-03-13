import { usePortfolioStore } from '../store/portfolioStore';
import { WelcomeSetup } from '../components/setup/WelcomeSetup';
import { Dashboard } from '../components/dashboard/Dashboard';

export default function App() {
    const isConfigured = usePortfolioStore((state) => state.isConfigured);

    // 根據是否已經完成了初始設定，決定顯示歡迎設定頁或主要儀表板
    if (!isConfigured) {
        return <WelcomeSetup />;
    }

    return <Dashboard />;
}
