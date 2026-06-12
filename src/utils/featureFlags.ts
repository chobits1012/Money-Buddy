/** 狗狗庭院功能開關（本機 dev 預設開啟；Production 預設關閉，Preview 可於 Vercel 設為 true） */
export function isPetDashboardEnabled(): boolean {
    if (import.meta.env.DEV) return true;
    return import.meta.env.VITE_ENABLE_PET_DASHBOARD === 'true';
}
