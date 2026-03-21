import { supabase } from '../lib/supabase';
import { encryptedLocalStorage } from './storageEncryption';

export const PERSIST_STORE_NAME = 'portfolio-tracker-storage';

const SUFFIX_KEY = 'portfolio-tracker-persist-suffix';
const LEGACY_MIGRATION_FLAG = 'portfolio-tracker-legacy-slot-migrated-v2';

/** Zustand persist 實際讀寫的 localStorage key（含加密 blob） */
export function getPersistStorageKey(): string {
    const suffix = localStorage.getItem(SUFFIX_KEY);
    return suffix ? `${PERSIST_STORE_NAME}:${suffix}` : PERSIST_STORE_NAME;
}

export function getPersistSuffixFromDisk(): string | null {
    return localStorage.getItem(SUFFIX_KEY);
}

export function setPersistSuffix(userId: string | null): void {
    if (userId) {
        localStorage.setItem(SUFFIX_KEY, userId);
    } else {
        localStorage.removeItem(SUFFIX_KEY);
    }
}

interface PersistBlob {
    state: Record<string, unknown>;
    version?: number;
}

function parsePersistBlob(json: string | null): PersistBlob | null {
    if (!json) return null;
    try {
        const parsed = JSON.parse(json) as PersistBlob;
        if (parsed && typeof parsed === 'object' && 'state' in parsed) {
            return parsed;
        }
    } catch {
        /* ignore */
    }
    return null;
}

/**
 * 將舊版單一 key 的加密資料複製到依 owner 分槽的 key（僅執行一次）。
 */
function migrateLegacySlotIfNeeded(): void {
    if (localStorage.getItem(LEGACY_MIGRATION_FLAG)) return;

    const suffix = localStorage.getItem(SUFFIX_KEY);
    if (suffix) {
        localStorage.setItem(LEGACY_MIGRATION_FLAG, '1');
        return;
    }

    const legacyKey = PERSIST_STORE_NAME;
    const legacyEncrypted = localStorage.getItem(legacyKey);
    if (!legacyEncrypted) {
        localStorage.setItem(LEGACY_MIGRATION_FLAG, '1');
        return;
    }

    const decrypted = encryptedLocalStorage.getItem(legacyKey);
    const blob = parsePersistBlob(decrypted);
    const ownerFromState = blob?.state?.localDataOwnerId;
    const targetSuffix =
        typeof ownerFromState === 'string' && ownerFromState.length > 0
            ? ownerFromState
            : null;

    if (targetSuffix) {
        const newKey = `${PERSIST_STORE_NAME}:${targetSuffix}`;
        if (!localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, legacyEncrypted);
        }
        setPersistSuffix(targetSuffix);
    }

    localStorage.setItem(LEGACY_MIGRATION_FLAG, '1');
}

/**
 * 在建立 React root 前呼叫：決定 persist 後綴，使 Zustand rehydrate 讀到正確分槽。
 * 若磁碟已有後綴，優先使用（避免共用裝置時以新 session 覆寫上一使用者分槽）。
 */
export async function bootstrapPersistSuffix(): Promise<void> {
    const existing = getPersistSuffixFromDisk();
    if (existing) {
        return;
    }

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.id) {
        setPersistSuffix(session.user.id);
        return;
    }

    migrateLegacySlotIfNeeded();
}
