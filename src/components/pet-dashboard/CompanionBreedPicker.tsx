import { cn } from '../../utils/cn';
import {
    listSelectableBreeds,
    type CourtyardAssetType,
} from '../../utils/companionRegistry';

interface CompanionBreedPickerProps {
    assetType: CourtyardAssetType;
    value: string;
    onChange: (companionId: string) => void;
}

export function CompanionBreedPicker({ assetType, value, onChange }: CompanionBreedPickerProps) {
    const breeds = listSelectableBreeds(assetType);

    return (
        <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-clay tracking-wide uppercase">軍團吉祥物</span>
            <div className="grid grid-cols-2 gap-2">
                {breeds.map((breed) => (
                    <button
                        key={breed.id}
                        type="button"
                        onClick={() => onChange(breed.id)}
                        className={cn(
                            'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors',
                            value === breed.id
                                ? 'border-moss/50 bg-moss/10'
                                : 'border-stoneSoft/80 bg-white/40 hover:bg-white/60',
                        )}
                    >
                        <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: breed.color }}
                            aria-hidden
                        />
                        <span className="text-sm text-slate-800">{breed.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
