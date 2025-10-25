import { HEDERA_CONFIG } from './constants';

export const getExplorerUrl = (
  type: 'transaction' | 'account' | 'token' | 'topic',
  id: string,
  network: string = HEDERA_CONFIG.defaultNetwork
): string => {
  const baseUrl = HEDERA_CONFIG.networks[network as keyof typeof HEDERA_CONFIG.networks].explorerUrl;
  return `${baseUrl}/${type}/${id}`;
};

export const validateAccountId = (accountId: string): boolean => {
  const pattern = /^0\.0\.\d+$/;
  return pattern.test(accountId);
};

export const validateTokenId = (tokenId: string): boolean => {
  const pattern = /^0\.0\.\d+$/;
  return pattern.test(tokenId);
};

export const validateTopicId = (topicId: string): boolean => {
  const pattern = /^0\.0\.\d+$/;
  return pattern.test(topicId);
};

export const formatHederaId = (id: string): string => {
  return id.replace(/^0\.0\./, '');
};

export const parseHederaId = (id: string): string => {
  if (id.startsWith('0.0.')) return id;
  return `0.0.${id}`;
};

export const getNetworkFromAccountId = (accountId: string): string => {
  // Simple heuristic: testnet accounts typically have lower numbers
  const accountNum = parseInt(accountId.split('.')[2]);
  return accountNum < 1000000 ? 'testnet' : 'mainnet';
};