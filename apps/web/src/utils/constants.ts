export const APP_CONFIG = {
  name: 'Hedera Africa',
  description: 'Tokenisation de parcelles et DeFi sur Hedera',
  version: '1.0.0',
  author: 'Hedera Africa Team',
  repository: 'https://github.com/hedera-africa/dapp',
  website: 'https://hedera-africa.com',
};

export const HEDERA_CONFIG = {
  networks: {
    testnet: {
      name: 'Testnet',
      explorerUrl: 'https://hashscan.io/testnet',
      mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
    },
    mainnet: {
      name: 'Mainnet',
      explorerUrl: 'https://hashscan.io/mainnet',
      mirrorNodeUrl: 'https://mainnet-public.mirrornode.hedera.com',
    },
  },
  defaultNetwork: 'testnet' as const,
};

export const LOAN_CONFIG = {
  minLtv: 30, // 30%
  maxLtv: 70, // 70%
  defaultLtv: 60, // 60%
  baseApr: 8.5, // 8.5%
  liquidationThreshold: 75, // 75%
  minLoanAmount: 1000, // $1,000
  maxLoanAmount: 100000, // $100,000
};

export const PARCEL_CONFIG = {
  minArea: 100, // 100 m²
  maxArea: 1000000, // 100 hectares
  minPrice: 1000, // $1,000
  maxPrice: 10000000, // $10M
};

export const UI_CONFIG = {
  toastDuration: 4000,
  animationDuration: 300,
  debounceDelay: 300,
  pageSize: 12,
};