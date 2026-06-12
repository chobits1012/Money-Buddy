import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { HoldingsPage } from '../components/holdings/HoldingsPage';
import { parseHoldingMarketParam } from '../utils/holdingRoutes';

export function HoldingsRoutePage() {
    const navigate = useNavigate();
    const { market } = useParams();
    const [searchParams] = useSearchParams();
    const type = parseHoldingMarketParam(market);
    const initialPoolId = searchParams.get('pool');

    if (!type) {
        navigate('/', { replace: true });
        return null;
    }

    return (
        <HoldingsPage
            type={type}
            initialPoolId={initialPoolId}
            onBack={() => navigate('/')}
        />
    );
}
