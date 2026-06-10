import { useNavigate, useParams } from 'react-router-dom';
import { HoldingsPage } from '../components/holdings/HoldingsPage';
import { parseHoldingMarketParam } from '../utils/holdingRoutes';

export function HoldingsRoutePage() {
    const navigate = useNavigate();
    const { market } = useParams();
    const type = parseHoldingMarketParam(market);

    if (!type) {
        navigate('/', { replace: true });
        return null;
    }

    return <HoldingsPage type={type} onBack={() => navigate('/')} />;
}
