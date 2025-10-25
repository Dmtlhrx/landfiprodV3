export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('fr-FR').format(value);
};

export const formatArea = (areaM2: number): string => {
  if (areaM2 >= 10000) {
    return `${(areaM2 / 10000).toFixed(1)} ha`;
  }
  return `${formatNumber(areaM2)} m²`;
};

export const formatPercentage = (bps: number): string => {
  return `${(bps / 100).toFixed(1)}%`;
};

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const formatAccountId = (accountId: string): string => {
  if (accountId.length <= 12) return accountId;
  return `${accountId.slice(0, 6)}...${accountId.slice(-6)}`;
};

export const formatTokenId = (tokenId: string): string => {
  const parts = tokenId.split('.');
  if (parts.length === 3) {
    return `#${parts[2]}`;
  }
  return tokenId;
};