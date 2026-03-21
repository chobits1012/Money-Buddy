import { supabase } from './supabase';
import type { PortfolioState } from '../types';

export interface CloudBackupRow {
    portfolio_data: PortfolioState | null;
    updated_at: string | null;
}

export async function fetchCloudBackup(userId: string): Promise<CloudBackupRow | null> {
    const { data, error } = await supabase
        .from('user_backup')
        .select('portfolio_data, updated_at')
        .eq('id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }

    return {
        portfolio_data: (data?.portfolio_data as PortfolioState | null) ?? null,
        updated_at: data?.updated_at ?? null,
    };
}
