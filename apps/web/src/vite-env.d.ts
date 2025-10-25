/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_WALLETCONNECT_PROJECT_ID: string
    readonly VITE_APP_NAME: string
    readonly VITE_APP_DESCRIPTION: string
    readonly VITE_APP_URL: string
    readonly VITE_HEDERA_NETWORK: string
    // Ajoutez d'autres variables d'environnement Vite si nécessaire
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }