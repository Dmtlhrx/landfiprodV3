import {
  Client,
  PrivateKey,
  AccountId,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TransferTransaction,
  TokenAssociateTransaction,
  Hbar,
  TransactionResponse,
  TransactionReceipt,
  TokenId,
  TopicId,
  NftId,
  AccountBalanceQuery,
  TokenInfoQuery,
} from '@hashgraph/sdk';
import { logger } from '../utils/logger.js';

interface ParcelMetadata {
  parcelId: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  areaM2: number;
  documents?: string[];
}

interface HCSMessage {
  event: string;
  parcelId: string;
  tokenId?: string;
  transactionId?: string;
  timestamp?: string;
  metadata?: any;
}

interface MintResult {
  tokenId: string;
  serialNumber: string;
  transactionId: string;
  paymentTransactionId?: string;
}

class HederaService {
  private client: Client;
  private operatorKey: PrivateKey;
  private operatorAccountId: AccountId;
  private topicId?: TopicId;
  private treasuryAccountId: AccountId;

  constructor() {
    const network = process.env.HEDERA_NETWORK || 'testnet';
    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const treasuryId = process.env.HEDERA_TREASURY_ID || operatorId;

    if (!operatorId || !operatorKey) {
      throw new Error('Hedera operator credentials not configured');
    }

    try {
      this.client = network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
      this.operatorKey = PrivateKey.fromString(operatorKey);
      this.operatorAccountId = AccountId.fromString(operatorId);
      this.treasuryAccountId = AccountId.fromString(treasuryId!);
      
      this.client.setOperator(this.operatorAccountId, this.operatorKey);
      
      if (process.env.HCS_TOPIC_ID) {
        this.topicId = TopicId.fromString(process.env.HCS_TOPIC_ID);
      }
      
      logger.info(`Hedera service initialized for ${network}`);
      logger.info(`Operator: ${this.operatorAccountId.toString()}`);
      logger.info(`Treasury: ${this.treasuryAccountId.toString()}`);
    } catch (error) {
      logger.error('Failed to initialize Hedera service:', error);
      throw new Error(`Hedera service initialization failed: ${error.message}`);
    }
  }

  async ensureTopicExists(): Promise<TopicId> {
    if (this.topicId) {
      return this.topicId;
    }

    try {
      const topicCreateTx = new TopicCreateTransaction()
        .setTopicMemo('Hedera Africa - Land Tokenization Activity Feed')
        .setAdminKey(this.operatorKey.publicKey)
        .setSubmitKey(this.operatorKey.publicKey)
        .setMaxTransactionFee(new Hbar(2));

      const topicCreateResponse = await topicCreateTx.execute(this.client);
      const topicCreateReceipt = await topicCreateResponse.getReceipt(this.client);

      this.topicId = topicCreateReceipt.topicId!;
      
      logger.info(`HCS Topic created: ${this.topicId.toString()}`);
      return this.topicId;
    } catch (error) {
      logger.error('HCS topic creation error:', error);
      throw error;
    }
  }

  // FIX: Optimized metadata to stay under Hedera's limit (~100 bytes)
  private createOptimizedMetadata(metadata: ParcelMetadata): any {
    // Create ultra-compact metadata to avoid METADATA_TOO_LONG error
    const compactMetadata = {
      id: metadata.parcelId.slice(-8), // Use last 8 chars of parcelId
      t: metadata.title.slice(0, 20), // Truncate title to 20 chars
      area: metadata.areaM2,
      ts: Math.floor(Date.now() / 1000), // Unix timestamp (shorter)
    };

    // Add description only if it's short
    if (metadata.description && metadata.description.length <= 30) {
      compactMetadata['d'] = metadata.description.slice(0, 30);
    }

    return compactMetadata;
  }

  async createParcelToken(metadata: ParcelMetadata): Promise<{ tokenId: string; transactionId: string }> {
    try {
      logger.info(`Creating token for parcel ${metadata.parcelId}`);

      // FIX: Create highly optimized metadata to avoid size limits
      const nftMetadata = this.createOptimizedMetadata(metadata);
      
      // Log the metadata size for debugging
      const metadataString = JSON.stringify(nftMetadata);
      const metadataSize = Buffer.byteLength(metadataString, 'utf8');
      logger.info(`Metadata size: ${metadataSize} bytes`);
      
      if (metadataSize > 100) {
        logger.warn(`Metadata size (${metadataSize} bytes) might be too large`);
      }

      logger.debug('Compact token metadata:', metadataString);

      // Create token with shorter name to avoid TOKEN_NAME_TOO_LONG
      const tokenName = `HAL#${metadata.parcelId.slice(-6)}`;
      
      const tokenCreateTx = new TokenCreateTransaction()
        .setTokenName(tokenName)
        .setTokenSymbol('HAL')
        .setTokenType(TokenType.NonFungibleUnique)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(1)
        .setTreasuryAccountId(this.treasuryAccountId)
        .setSupplyKey(this.operatorKey)
        .setAdminKey(this.operatorKey)
        .setFreezeKey(this.operatorKey)
        .setWipeKey(this.operatorKey)
        .setMaxTransactionFee(new Hbar(10));

      logger.debug('Token creation transaction prepared');

      const tokenCreateResponse = await tokenCreateTx.execute(this.client);
      logger.debug(`Token creation submitted: ${tokenCreateResponse.transactionId}`);

      const tokenCreateReceipt = await tokenCreateResponse.getReceipt(this.client);
      const tokenId = tokenCreateReceipt.tokenId!;

      logger.info(`Token created: ${tokenId.toString()}`);

      // FIX: Use the compact metadata for minting
      const metadataBytes = Buffer.from(metadataString, 'utf8');
      
      // Double-check the size before minting
      if (metadataBytes.length > 100) {
        throw new Error(`Metadata still too large: ${metadataBytes.length} bytes`);
      }

      const tokenMintTx = new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([metadataBytes])
        .setMaxTransactionFee(new Hbar(10));

      logger.debug('Token mint transaction prepared');

      const tokenMintResponse = await tokenMintTx.execute(this.client);
      logger.debug(`Token mint submitted: ${tokenMintResponse.transactionId}`);

      const tokenMintReceipt = await tokenMintResponse.getReceipt(this.client);

      logger.info(`Token minted: ${tokenId.toString()} - Serial: ${tokenMintReceipt.serials[0]} for parcel ${metadata.parcelId}`);

      // Store full metadata in HCS for reference
      await this.storeFullMetadataInHCS(tokenId.toString(), metadata);

      return {
        tokenId: tokenId.toString(),
        transactionId: tokenCreateResponse.transactionId.toString(),
      };
    } catch (error: any) {
      logger.error('Token creation error:', {
        error: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack
      });
      
      // Better error messages
      if (error.message?.includes('METADATA_TOO_LONG')) {
        throw new Error('NFT metadata is too large. Please reduce the description length or number of documents.');
      } else if (error.message?.includes('INSUFFICIENT_ACCOUNT_BALANCE')) {
        throw new Error('Insufficient account balance to create token. Please fund the treasury account.');
      } else if (error.message?.includes('INVALID_SIGNATURE')) {
        throw new Error('Invalid signature for token creation transaction.');
      } else if (error.message?.includes('TOKEN_NAME_TOO_LONG')) {
        throw new Error('Token name is too long. Please use a shorter parcel title.');
      } else {
        throw new Error(`Token creation failed: ${error.message}`);
      }
    }
  }

  // FIX: Store full metadata in HCS since NFT metadata is limited
  private async storeFullMetadataInHCS(tokenId: string, metadata: ParcelMetadata): Promise<void> {
    try {
      const fullMetadataMessage = {
        event: 'NFT_METADATA_STORED',
        parcelId: metadata.parcelId,
        tokenId,
        metadata: {
          type: 'FULL_PARCEL_METADATA',
          parcelId: metadata.parcelId,
          title: metadata.title,
          description: metadata.description || '',
          coordinates: {
            latitude: metadata.latitude,
            longitude: metadata.longitude,
          },
          areaM2: metadata.areaM2,
          documents: metadata.documents || [],
          tokenId,
          created_at: new Date().toISOString(),
          creator: 'Hedera Africa Platform',
        }
      };

      await this.publishToHCS(fullMetadataMessage);
      logger.info(`Full metadata stored in HCS for token ${tokenId}`);
    } catch (error) {
      logger.warn('Failed to store full metadata in HCS:', error);
      // Don't throw here as the main token creation succeeded
    }
  }

  async processParcelMinting(
    userAccountId: string,
    metadata: ParcelMetadata
  ): Promise<MintResult> {
    try {
      logger.info(`Starting minting process for user ${userAccountId}, parcel ${metadata.parcelId}`);

      // Validation
      if (!userAccountId || !metadata.parcelId) {
        throw new Error('Missing required parameters for minting');
      }

      // Validate account ID format
      let userAccount: AccountId;
      try {
        userAccount = AccountId.fromString(userAccountId);
      } catch (error) {
        throw new Error(`Invalid user account ID format: ${userAccountId}`);
      }

      // Step 1: Create and mint the token
      logger.info('Step 1: Creating token');
      const { tokenId, transactionId } = await this.createParcelToken(metadata);

      // Step 2: Prepare token association (user needs to sign this)
      logger.info('Step 2: Preparing token association');
      
      try {
        const associateTx = new TokenAssociateTransaction()
          .setAccountId(userAccount)
          .setTokenIds([TokenId.fromString(tokenId)])
          .setMaxTransactionFee(new Hbar(5));

        logger.info('Token association transaction prepared (requires user signature)');
      } catch (associateError) {
        logger.warn('Token association preparation failed:', associateError);
      }

      logger.info(`Minting completed: Token ${tokenId} created for parcel ${metadata.parcelId}`);

      return {
        tokenId,
        serialNumber: '1',
        transactionId,
      };

    } catch (error: any) {
      logger.error('Parcel minting process error:', {
        error: error.message,
        userAccountId,
        parcelId: metadata.parcelId,
        stack: error.stack
      });

      // Clear error messages
      if (error.message?.includes('metadata is too large')) {
        throw error;
      } else if (error.message?.includes('Token creation failed')) {
        throw error;
      } else if (error.message?.includes('Invalid user account')) {
        throw error;
      } else if (error.message?.includes('INSUFFICIENT')) {
        throw new Error('Insufficient funds in treasury account for minting operations');
      } else {
        throw new Error(`NFT minting failed: ${error.message}`);
      }
    }
  }

  async transferNFTToUser(
    tokenId: string,
    userAccountId: string,
    serialNumber: number = 1
  ): Promise<{ transactionId: string }> {
    try {
      logger.info(`Transferring NFT ${tokenId} serial ${serialNumber} to user ${userAccountId}`);

      const userAccount = AccountId.fromString(userAccountId);
      const token = TokenId.fromString(tokenId);

      const transferTx = new TransferTransaction()
        .addNftTransfer(token, serialNumber, this.treasuryAccountId, userAccount)
        .setTransactionMemo(`Transfer parcel NFT to owner - Token: ${tokenId}`)
        .setMaxTransactionFee(new Hbar(5));

      const transferResponse = await transferTx.execute(this.client);
      const transferReceipt = await transferResponse.getReceipt(this.client);

      if (transferReceipt.status.toString() !== 'SUCCESS') {
        throw new Error(`Transfer failed with status: ${transferReceipt.status.toString()}`);
      }

      logger.info(`NFT transferred successfully to user: ${userAccountId}`);

      return {
        transactionId: transferResponse.transactionId.toString()
      };

    } catch (error: any) {
      logger.error('NFT transfer error:', {
        error: error.message,
        tokenId,
        userAccountId,
        serialNumber
      });

      if (error.message?.includes('TOKEN_NOT_ASSOCIATED_TO_ACCOUNT')) {
        throw new Error('Token not associated with user account. Please associate the token first.');
      } else if (error.message?.includes('INSUFFICIENT_TOKEN_BALANCE')) {
        throw new Error('Treasury does not own this NFT anymore.');
      } else {
        throw new Error(`NFT transfer failed: ${error.message}`);
      }
    }
  }

  async getTokenInfo(tokenId: string) {
    try {
      const tokenInfo = await new TokenInfoQuery()
        .setTokenId(TokenId.fromString(tokenId))
        .execute(this.client);

      return {
        tokenId: tokenInfo.tokenId.toString(),
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        totalSupply: tokenInfo.totalSupply.toString(),
        treasury: tokenInfo.treasuryAccountId.toString(),
        supplyType: tokenInfo.supplyType.toString(),
        maxSupply: tokenInfo.maxSupply?.toString() || 'N/A',
      };
    } catch (error) {
      logger.error('Get token info error:', error);
      throw error;
    }
  }

  async getAccountBalance(accountId: string) {
    try {
      const balance = await new AccountBalanceQuery()
        .setAccountId(AccountId.fromString(accountId))
        .execute(this.client);

      return {
        hbars: balance.hbars.toString(),
        tokens: Object.fromEntries(balance.tokens || new Map()),
      };
    } catch (error) {
      logger.error('Get account balance error:', error);
      throw error;
    }
  }

  async publishToHCS(message: HCSMessage | string): Promise<{ topicId: string; transactionId: string; sequenceNumber: string }> {
    try {
      const topicId = await this.ensureTopicExists();
      
      let messageData: any;
      
      if (typeof message === 'string') {
        messageData = {
          data: message,
          timestamp: new Date().toISOString(),
          source: 'hedera-africa-dapp',
          version: '1.0.0',
        };
      } else {
        messageData = {
          ...message,
          timestamp: new Date().toISOString(),
          source: 'hedera-africa-dapp',
          version: '1.0.0',
        };
      }

      const messageBytes = Buffer.from(JSON.stringify(messageData));

      const topicMessageTx = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(messageBytes)
        .setMaxTransactionFee(new Hbar(2));

      const response = await topicMessageTx.execute(this.client);
      const receipt = await response.getReceipt(this.client);

      logger.info(`HCS message published: ${typeof message === 'string' ? 'string data' : message.event}`);

      return {
        topicId: topicId.toString(),
        transactionId: response.transactionId.toString(),
        sequenceNumber: receipt.topicSequenceNumber!.toString(),
      };
    } catch (error) {
      logger.error('HCS publish error:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const operatorBalance = await new AccountBalanceQuery()
        .setAccountId(this.operatorAccountId)
        .execute(this.client);

      const treasuryBalance = await new AccountBalanceQuery()
        .setAccountId(this.treasuryAccountId)
        .execute(this.client);

      return {
        status: 'healthy',
        network: this.client.ledgerId?.toString() || 'unknown',
        operator: {
          accountId: this.operatorAccountId.toString(),
          balance: operatorBalance.hbars.toString()
        },
        treasury: {
          accountId: this.treasuryAccountId.toString(),
          balance: treasuryBalance.hbars.toString()
        },
        topic: this.topicId?.toString() || 'not set'
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

// Enhanced methods for HederaService class

async createLoanContract(loanData: {
  borrowerId: string;
  lenderId: string;
  collateralTokenId: string;
  principalAmount: number;
  interestRate: number;
  duration: number;
  ltvRatio: number;
}) {
  try {
    logger.info(`Creating loan contract between ${loanData.borrowerId} and ${loanData.lenderId}`);

    // Validate account IDs
    let borrowerAccount: AccountId;
    let lenderAccount: AccountId;
    let tokenId: TokenId;

    try {
      borrowerAccount = AccountId.fromString(loanData.borrowerId);
      lenderAccount = AccountId.fromString(loanData.lenderId);
      tokenId = TokenId.fromString(loanData.collateralTokenId);
    } catch (parseError) {
      throw new Error(`Invalid account or token ID format: ${parseError.message}`);
    }

    // Check operator balance first
    const operatorBalance = await new AccountBalanceQuery()
      .setAccountId(this.operatorAccountId)
      .execute(this.client);

    const availableHbars = operatorBalance.hbars.toBigNumber();
    const requiredHbars = new Hbar(10).toBigNumber(); // Estimate required fees

    if (availableHbars.isLessThan(requiredHbars)) {
      throw new Error(`Insufficient operator balance: ${availableHbars.toString()} HBAR available, ${requiredHbars.toString()} HBAR required`);
    }

    // Create loan contract topic with retry logic
    let loanTopicId: TopicId | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !loanTopicId) {
      try {
        const loanTopicTx = new TopicCreateTransaction()
          .setTopicMemo(`P2P Loan: ${loanData.borrowerId.slice(-6)}-${loanData.lenderId.slice(-6)}`)
          .setAdminKey(this.operatorKey.publicKey)
          .setSubmitKey(this.operatorKey.publicKey)
          .setMaxTransactionFee(new Hbar(5))
          .freezeWith(this.client);

        const loanTopicResponse = await loanTopicTx.execute(this.client);
        const loanTopicReceipt = await loanTopicResponse.getReceipt(this.client);
        
        if (loanTopicReceipt.status.toString() !== 'SUCCESS') {
          throw new Error(`Topic creation failed with status: ${loanTopicReceipt.status.toString()}`);
        }

        loanTopicId = loanTopicReceipt.topicId;
        logger.info(`Loan contract topic created: ${loanTopicId.toString()}`);
        break;

      } catch (topicError: any) {
        attempts++;
        logger.warn(`Topic creation attempt ${attempts} failed:`, topicError.message);
        
        if (attempts >= maxAttempts) {
          if (topicError.message?.includes('INSUFFICIENT_ACCOUNT_BALANCE')) {
            throw new Error('Insufficient HBAR balance for loan contract creation');
          } else if (topicError.message?.includes('INVALID_SIGNATURE')) {
            throw new Error('Invalid operator signature for loan contract creation');
          } else {
            throw new Error(`Failed to create loan contract topic after ${maxAttempts} attempts: ${topicError.message}`);
          }
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!loanTopicId) {
      throw new Error('Failed to create loan contract topic');
    }

      



    // Create and publish loan contract message
    const loanMessage = {
      event: 'LOAN_CONTRACT_CREATED',
      parcelId: loanData.collateralTokenId,
      metadata: {
        type: 'P2P_LOAN_CONTRACT',
        contractVersion: '1.0',
        borrowerId: loanData.borrowerId,
        lenderId: loanData.lenderId,
        collateralTokenId: loanData.collateralTokenId,
        terms: {
          principalAmount: loanData.principalAmount,
          interestRate: loanData.interestRate,
          duration: loanData.duration,
          ltvRatio: loanData.ltvRatio
        },
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        contractTopicId: loanTopicId.toString(),
        network: this.client.ledgerId?.toString() || 'testnet'
      }
    };

    try {
      await this.publishToHCS(loanMessage);
    } catch (hcsError) {
      logger.warn('Failed to publish loan contract to HCS:', hcsError);
      // Don't fail the entire operation if HCS publish fails
    }

    logger.info(`Loan contract created successfully: ${loanTopicId.toString()}`);

    return {
      success: true,
      contractTopicId: loanTopicId.toString(),
      status: 'CONTRACT_CREATED'
    };

  } catch (error: any) {
    logger.error('Loan contract creation error:', {
      error: error.message,
      loanData,
      stack: error.stack
    });

    // Provide specific error messages
    if (error.message?.includes('Insufficient operator balance')) {
      throw error;
    } else if (error.message?.includes('Invalid account')) {
      throw error;
    } else if (error.message?.includes('INSUFFICIENT_ACCOUNT_BALANCE')) {
      throw new Error('Insufficient HBAR balance in operator account for loan contract creation');
    } else if (error.message?.includes('INVALID_SIGNATURE')) {
      throw new Error('Invalid operator signature - please check operator key configuration');
    } else if (error.message?.includes('BUSY')) {
      throw new Error('Hedera network is busy - please try again in a few moments');
    } else {
      throw new Error(`Loan contract creation failed: ${error.message}`);
    }
  }
}

async lockCollateral(tokenId: string, borrowerAccountId: string) {
  try {
    logger.info(`Locking collateral ${tokenId} from ${borrowerAccountId}`);

    // Validate inputs
    let borrowerAccount: AccountId;
    let token: TokenId;

    try {
      borrowerAccount = AccountId.fromString(borrowerAccountId);
      token = TokenId.fromString(tokenId);
    } catch (parseError) {
      throw new Error(`Invalid account or token ID format: ${parseError.message}`);
    }

    // Check if borrower owns the NFT
    try {
      const borrowerBalance = await new AccountBalanceQuery()
        .setAccountId(borrowerAccount)
        .execute(this.client);

      const tokenBalance = borrowerBalance.tokens?.get(token);
      if (!tokenBalance || tokenBalance.toNumber() < 1) {
        throw new Error(`Borrower does not own NFT ${tokenId}`);
      }
    } catch (balanceError) {
      logger.warn('Could not verify NFT ownership:', balanceError);
      // Continue anyway as the transfer will fail if they don't own it
    }

    // Check operator balance
    const operatorBalance = await new AccountBalanceQuery()
      .setAccountId(this.operatorAccountId)
      .execute(this.client);

    if (operatorBalance.hbars.toBigNumber().isLessThan(new Hbar(5).toBigNumber())) {
      throw new Error('Insufficient HBAR balance for collateral locking');
    }

    // Ensure operator is associated with the token
    try {
      const associationTx = new TokenAssociateTransaction()
        .setAccountId(this.operatorAccountId)
        .setTokenIds([token])
        .setMaxTransactionFee(new Hbar(2))
        .freezeWith(this.client);

      const associationResponse = await associationTx.execute(this.client);
      await associationResponse.getReceipt(this.client);
      
      logger.info('Operator token association confirmed');
    } catch (associationError: any) {
      // Token might already be associated
      if (!associationError.message?.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT')) {
        logger.warn('Token association warning:', associationError.message);
      }
    }

    // Transfer NFT to operator account (escrow)
    let transferAttempts = 0;
    const maxTransferAttempts = 3;
    let transferSuccess = false;
    let transferResponse: TransactionResponse;

    while (transferAttempts < maxTransferAttempts && !transferSuccess) {
      try {
        const transferTx = new TransferTransaction()
          .addNftTransfer(token, 1, borrowerAccount, this.operatorAccountId)
          .setTransactionMemo(`Collateral Lock: ${tokenId}`)
          .setMaxTransactionFee(new Hbar(5))
          .freezeWith(this.client);

        transferResponse = await transferTx.execute(this.client);
        const transferReceipt = await transferResponse.getReceipt(this.client);

        if (transferReceipt.status.toString() !== 'SUCCESS') {
          throw new Error(`Transfer failed with status: ${transferReceipt.status.toString()}`);
        }

        transferSuccess = true;
        logger.info(`Collateral NFT ${tokenId} successfully locked in escrow`);

      } catch (transferError: any) {
        transferAttempts++;
        logger.warn(`Collateral transfer attempt ${transferAttempts} failed:`, transferError.message);

        if (transferAttempts >= maxTransferAttempts) {
          if (transferError.message?.includes('TOKEN_NOT_ASSOCIATED_TO_ACCOUNT')) {
            throw new Error('Token not associated with borrower account - please associate token first');
          } else if (transferError.message?.includes('INSUFFICIENT_TOKEN_BALANCE')) {
            throw new Error('Borrower does not own the required NFT');
          } else if (transferError.message?.includes('INVALID_SIGNATURE')) {
            throw new Error('Invalid signature for collateral transfer - borrower must sign the transaction');
          } else {
            throw new Error(`Collateral transfer failed after ${maxTransferAttempts} attempts: ${transferError.message}`);
          }
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * transferAttempts));
      }
    }

    if (!transferSuccess || !transferResponse!) {
      throw new Error('Failed to lock collateral after multiple attempts');
    }

    // Publish collateral lock event to HCS
    const lockMessage = {
      event: 'COLLATERAL_LOCKED',
      parcelId: tokenId,
      tokenId,
      metadata: {
        type: 'COLLATERAL_LOCK',
        tokenId,
        borrowerAccountId,
        escrowAccountId: this.operatorAccountId.toString(),
        lockTimestamp: new Date().toISOString(),
        transactionId: transferResponse.transactionId.toString(),
        status: 'LOCKED'
      }
    };

    try {
      await this.publishToHCS(lockMessage);
    } catch (hcsError) {
      logger.warn('Failed to publish collateral lock to HCS:', hcsError);
      // Don't fail the operation if HCS fails
    }

    return {
      success: true,
      escrowAccountId: this.operatorAccountId.toString(),
      transactionId: transferResponse.transactionId.toString(),
      status: 'COLLATERAL_LOCKED',
      lockedAt: new Date().toISOString()
    };

  } catch (error: any) {
    logger.error('Collateral locking error:', {
      error: error.message,
      tokenId,
      borrowerAccountId,
      stack: error.stack
    });

    // Provide specific error messages
    if (error.message?.includes('does not own NFT')) {
      throw error;
    } else if (error.message?.includes('Token not associated')) {
      throw error;
    } else if (error.message?.includes('Insufficient HBAR')) {
      throw error;
    } else if (error.message?.includes('INSUFFICIENT_TOKEN_BALANCE')) {
      throw new Error('Borrower does not own the required NFT for collateral');
    } else if (error.message?.includes('TOKEN_NOT_ASSOCIATED')) {
      throw new Error('Token must be associated with both borrower and platform accounts');
    } else if (error.message?.includes('INVALID_SIGNATURE')) {
      throw new Error('Invalid signature - borrower must authorize the collateral transfer');
    } else {
      throw new Error(`Collateral locking failed: ${error.message}`);
    }
  }
}

// Add a helper method to check system health before operations
async validateSystemHealth(): Promise<void> {
  try {
    // Check operator balance
    const balance = await new AccountBalanceQuery()
      .setAccountId(this.operatorAccountId)
      .execute(this.client);

    const minRequired = new Hbar(10);
    if (balance.hbars.toBigNumber().isLessThan(minRequired.toBigNumber())) {
      throw new Error(`Operator account has insufficient balance: ${balance.hbars.toString()} (minimum ${minRequired.toString()} required)`);
    }

    // Check treasury balance
    const treasuryBalance = await new AccountBalanceQuery()
      .setAccountId(this.treasuryAccountId)
      .execute(this.client);

    if (treasuryBalance.hbars.toBigNumber().isLessThan(new Hbar(5).toBigNumber())) {
      logger.warn(`Treasury account has low balance: ${treasuryBalance.hbars.toString()}`);
    }

    logger.debug('System health check passed');
  } catch (error) {
    logger.error('System health check failed:', error);
    throw new Error(`System health check failed: ${error.message}`);
  }
}

 
}

export const hederaService = new HederaService();
