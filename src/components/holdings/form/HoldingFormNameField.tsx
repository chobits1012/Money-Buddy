import type { StockAssetType } from '../../../types';
import { Input } from '../../ui/Input';
import { AssetSearchInput } from '../AssetSearchInput';

interface HoldingFormNameFieldProps {
    type: StockAssetType;
    name: string;
    placeholder: string;
    error?: string;
    isEditMode: boolean;
    onNameChange: (value: string) => void;
    onSelect: (name: string, symbol: string) => void;
}

export const HoldingFormNameField = ({
    type,
    name,
    placeholder,
    error,
    isEditMode,
    onNameChange,
    onSelect,
}: HoldingFormNameFieldProps) => {
    if (type === 'TAIWAN_STOCK' || type === 'US_STOCK' || type === 'FUNDS') {
        return (
            <AssetSearchInput
                type={type}
                value={name}
                onChange={onNameChange}
                onSelect={(selectedName, sym) => {
                    onSelect(type === 'FUNDS' ? selectedName : `${selectedName} (${sym})`, sym);
                }}
                placeholder={placeholder}
                error={error}
                disabled={isEditMode}
            />
        );
    }

    return (
        <Input
            label="標的名稱"
            placeholder={placeholder}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            autoFocus
            disabled={isEditMode}
            error={error}
        />
    );
};
