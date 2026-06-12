import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** 雲端同步未設定時為 null；本機記帳功能仍可正常使用 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
    ? createClient(supabaseUrl!, supabaseAnonKey!)
    : null;

export function requireSupabase(): SupabaseClient {
    if (!supabase) {
        throw new Error('Missing Supabase environment variables');
    }
    return supabase;
}
