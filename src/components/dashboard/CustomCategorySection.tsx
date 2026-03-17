import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FORMAT_TWD, CUSTOM_CATEGORY_COLORS } from '../../utils/constants';
import type { CustomCategory } from '../../types';

interface CustomCategorySectionProps {
    categories: CustomCategory[];
    onAdd: () => void;
    onEdit: (category: CustomCategory) => void;
    onRemove: (category: CustomCategory) => void;
}

export const CustomCategorySection = ({
    categories,
    onAdd,
    onEdit,
    onRemove
}: CustomCategorySectionProps) => {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-clay tracking-wide uppercase">自訂欄位</h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAdd}
                    className="text-xs"
                >
                    <span className="material-symbols-outlined text-base mr-1">add</span>
                    新增
                </Button>
            </div>

            {categories.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-8 text-center bg-white/20 border-dashed border-stoneSoft">
                    <p className="text-clay text-sm mb-1">尚無自訂欄位</p>
                    <p className="text-clay/60 text-xs">可自行新增如「緊急預備金」、「保險」等項目</p>
                </Card>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {categories.map((cat, idx) => {
                        const dotColor = CUSTOM_CATEGORY_COLORS[idx % CUSTOM_CATEGORY_COLORS.length];
                        return (
                            <Card key={cat.id} noPadding className="p-3.5 group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: dotColor }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-slate-800 text-sm truncate">{cat.name}</h4>
                                                {cat.note && (
                                                    <span className="text-[10px] text-clay bg-stoneSoft/40 px-1.5 py-0.5 rounded shrink-0 truncate max-w-[120px]">
                                                        {cat.note}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium text-slate-800 mt-0.5">
                                                {FORMAT_TWD.format(cat.amount)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
                                        <button
                                            onClick={() => onEdit(cat)}
                                            className="p-1.5 rounded-lg text-clay/40 hover:text-primary hover:bg-primary/10 transition-all"
                                            title="編輯"
                                        >
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>
                                        <button
                                            onClick={() => onRemove(cat)}
                                            className="p-1.5 rounded-lg text-clay/40 hover:text-rust hover:bg-rust/10 transition-all"
                                            title="刪除"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
