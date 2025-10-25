export interface User {
  id: string;
  email: string;
  displayName: string;
  walletHedera?: string;
  role: 'USER' | 'ADMIN';
  did?: string;
  createdAt: string;
}

export interface Parcel {
  id: string;
  ownerId: string;
  owner: User;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  areaM2: number;
  docUrl?: string;
  htsTokenId?: string;
  priceUsd?: number;
  status: 'DRAFT' | 'LISTED' | 'SOLD' | 'COLLATERALIZED'| 'MINTED';
  createdAt: string;
  activities: Activity[];
}

export interface Loan {
  id: string;
  borrowerId: string;
  borrower: User;
  parcelId: string;
  parcel: Parcel;
  principalUsd: number;
  ltvBps: number;
  rateAprBps: number;
  status: 'PENDING' | 'ACTIVE' | 'REPAID' | 'LIQUIDATED';
  createdAt: string;
}

export interface Activity {
  id: string;
  parcelId: string;
  type: string;
  ref?: string;
  createdAt: string;
}

export interface WalletState {
  isConnected: boolean;
  accountId?: string;
  network?: string;
}