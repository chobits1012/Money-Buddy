/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_ENABLE_PET_DASHBOARD?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
