import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_STORAGE_ENCRYPTION_KEY || 'default_secret_key_DO_NOT_USE_IN_PROD';

/** 與 portfolio 本地 persist 相同的 AES 加密層，供遷移與匯出讀寫 raw key 使用 */
export const encryptedLocalStorage = {
    getItem: (key: string): string | null => {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;
        try {
            const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            return decrypted ? decrypted : null;
        } catch (e) {
            console.error('解密本地資料失敗', e);
            return null;
        }
    },
    setItem: (key: string, value: string): void => {
        const encrypted = CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
        localStorage.setItem(key, encrypted);
    },
    removeItem: (key: string): void => {
        localStorage.removeItem(key);
    },
};
