import type { StateCreator } from 'zustand';
import type { CustomCategorySlice, PortfolioStore } from '../../types';
import { filterActive } from '../../utils/entityActive';

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
