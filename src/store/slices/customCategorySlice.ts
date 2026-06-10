import type { StateCreator } from 'zustand';
import type { CustomCategory, PortfolioStore } from '../../types';
import { filterActive } from '../../utils/entityActive';

export interface CustomCategoryState {
    customCategories: CustomCategory[];
}

export interface CustomCategoryActions {
    addCustomCategory: (params: { name: string; amount: number; note: string }) => void;
    updateCustomCategory: (id: string, updates: { name?: string; amount?: number; note?: string }) => void;
    removeCustomCategory: (id: string) => void;
    getCustomCategoriesTotal: () => number;
}

export type CustomCategorySlice = CustomCategoryState & CustomCategoryActions;

export const createCustomCategorySlice: StateCreator<
    PortfolioStore,
    [],
    [],
    CustomCategorySlice
> = (set, get) => ({
    customCategories: [],

    addCustomCategory: (params) => {
        const now = new Date().toISOString();
        set((state) => ({
            customCategories: [
                ...state.customCategories,
                {
                    id: crypto.randomUUID(),
                    name: params.name.trim(),
                    amount: params.amount,
                    note: params.note,
                    createdAt: now,
                    updatedAt: now,
                },
            ],
        }));
    },

    updateCustomCategory: (id, updates) => {
        set((state) => ({
            customCategories: state.customCategories.map((c) =>
                c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
            ),
        }));
    },

    removeCustomCategory: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
            customCategories: state.customCategories.map((c) =>
                c.id === id ? { ...c, deletedAt: now, updatedAt: now } : c,
            ),
        }));
    },

    getCustomCategoriesTotal: () => {
        return filterActive(get().customCategories).reduce((sum, c) => sum + c.amount, 0);
    },
});
