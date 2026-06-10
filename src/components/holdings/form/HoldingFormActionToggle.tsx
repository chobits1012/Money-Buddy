import { cn } from '../../../utils/cn';

interface HoldingFormActionToggleProps {
    action: 'BUY' | 'SELL';
    isSimpleMode: boolean;
    isFund: boolean;
    onSelect: (action: 'BUY' | 'SELL') => void;
}

export const HoldingFormActionToggle = ({
    action,
    isSimpleMode,
    isFund,
    onSelect,
}: HoldingFormActionToggleProps) => (
    <div className="flex bg-stoneSoft/30 p-1 rounded-xl">
        <button
            type="button"
            onClick={() => onSelect('BUY')}
            className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
                action === 'BUY' ? 'bg-white shadow-sm text-rust' : 'text-clay hover:text-slate-800',
            )}
        >
            {isSimpleMode ? '投入' : isFund ? '申購' : '買入'}
        </button>
        <button
            type="button"
            onClick={() => onSelect('SELL')}
            className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
                action === 'SELL' ? 'bg-white shadow-sm text-moss' : 'text-clay hover:text-slate-800',
            )}
        >
            {isSimpleMode ? '取回' : isFund ? '贖回' : '賣出'}
        </button>
    </div>
);
