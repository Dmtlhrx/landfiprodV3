export interface User {
  id: string;
  email: string;
  displayName: string;
  walletHedera?: string;
  role: 'USER' | 'ADMIN';
  did?: string;
  reputation: ReputationScore;
  createdAt: string;
  updatedAt: string;
}

export interface ReputationScore {
  totalScore: number;
  completedLoans: number;
  defaultedLoans: number;
  verifiedTransactions: number;
  communityEndorsements: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
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
  status: 'DRAFT' | 'LISTED' | 'SOLD' | 'COLLATERALIZED';
  verificationType: 'VERIFIED' | 'UNVERIFIED';
  verificationDetails?: VerificationDetails;
  createdAt: string;
  activities: Activity[];
}

export interface VerificationDetails {
  type: 'NOTARY' | 'STATE' | 'COMMUNITY' | 'NONE';
  verifiedBy?: string;
  verificationDate?: string;
  documentHash?: string;
  confidence: number; // 0-100
  riskAssessment: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface P2PLoan {
  id: string;
  borrowerId: string;
  borrower: User;
  lenderId?: string;
  lender?: User;
  parcelId: string;
  parcel: Parcel;
  principalUsd: number;
  interestRate: number;
  duration: number; // in months
  collateralRatio: number; // LTV
  status: 'OPEN' | 'FUNDED' | 'ACTIVE' | 'REPAID' | 'DEFAULTED' | 'LIQUIDATED';
  terms: LoanTerms;
  repaymentSchedule: RepaymentSchedule[];
  createdAt: string;
  fundedAt?: string;
  dueDate?: string;
}

export interface LoanTerms {
  autoLiquidation: boolean;
  gracePeriod: number; // days
  penaltyRate: number;
  earlyRepaymentAllowed: boolean;
  partialRepaymentAllowed: boolean;
}

export interface RepaymentSchedule {
  id: string;
  dueDate: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidAt?: string;
}

export interface LoanOffer {
  id: string;
  loanId: string;
  lenderId: string;
  lender: User;
  offeredAmount: number;
  interestRate: number;
  terms: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
}

export interface Activity {
  id: string;
  parcelId: string;
  type: string;
  ref?: string;
  metadata?: any;
  createdAt: string;
}

export interface WalletState {
  isConnected: boolean;
  accountId?: string;
  network?: string;
}

export interface RiskAssessment {
  overall: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: {
    verification: number;
    location: number;
    borrowerReputation: number;
    collateralValue: number;
    marketConditions: number;
  };
  recommendations: string[];
}