import type { ChangeEvent } from 'react';
import { Input } from '../../ui/Input';

interface SimpleAmountFieldProps {
    action: 'BUY' | 'SELL';
    amount: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const SimpleAmountField = ({ action, amount, onChange }: SimpleAmountFieldProps) => (
    <Input
        label={action === 'BUY' ? '投入金額 (TWD)' : '取回金額 (TWD)'}
        placeholder="例如: 10,000"
        value={amount}
        onChange={onChange}
        icon={<span className="font-semibold px-1 text-xs">NT$</span>}
    />
);
