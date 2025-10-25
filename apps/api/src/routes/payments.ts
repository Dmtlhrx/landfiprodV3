import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  Client, 
  TransferTransaction, 
  Hbar, 
  AccountId, 
  PrivateKey,
  TransactionId,
  TransactionReceipt,
  AccountBalanceQuery
} from '@hashgraph/sdk';

interface PaymentRequestBody {
  amount: number;
  currency: 'USD' | 'HBAR';
  userAccountId: string;
  purpose: 'parcel_mint' | 'other';
  parcelData?: any;
}

interface PaymentVerifyBody {
  transactionId: string;
  userAccountId: string;
  expectedAmount: number;
}

interface BalanceCheckParams {
  userAccountId: string;
}

// Configuration Hedera
const OPERATOR_ACCOUNT_ID = process.env.HEDERA_OPERATOR_ACCOUNT_ID!;
const OPERATOR_PRIVATE_KEY = process.env.HEDERA_OPERATOR_PRIVATE_KEY!;
const NETWORK = process.env.HEDERA_NETWORK || 'testnet';

// Taux de change fixe pour simplifier
const USD_TO_HBAR_RATE = 5;
const MINT_FEE_USD = 10;
const MINT_FEE_HBAR = MINT_FEE_USD * USD_TO_HBAR_RATE;

// Client Hedera
let hederaClient: Client;

if (NETWORK === 'mainnet') {
  hederaClient = Client.forMainnet();
} else {
  hederaClient = Client.forTestnet();
}

hederaClient.setOperator(
  AccountId.fromString(OPERATOR_ACCOUNT_ID),
  PrivateKey.fromString(OPERATOR_PRIVATE_KEY)
);

export async function paymentRoutes(fastify: FastifyInstance) {
  
  // Endpoint pour vérifier le solde d'un compte
  fastify.get('/check-balance/:userAccountId', async (request: FastifyRequest<{ 
    Params: BalanceCheckParams 
  }>, reply: FastifyReply) => {
    try {
      const { userAccountId } = request.params;
      
      if (!userAccountId) {
        return reply.status(400).send({ error: 'User account ID required' });
      }

      let accountId: AccountId;
      try {
        accountId = AccountId.fromString(userAccountId);
      } catch (error) {
        return reply.status(400).send({ error: 'Invalid account ID format' });
      }

      const accountBalance = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .execute(hederaClient);

      // Correction: convertir correctement les tinybars en HBAR
      const hbarBalance = Number(accountBalance.hbars.toTinybars()) / 100_000_000;
      const required = MINT_FEE_HBAR;

      return reply.send({
        success: true,
        balance: hbarBalance,
        required: required,
        canPay: hbarBalance >= required,
        accountId: userAccountId,
        network: NETWORK
      });

    } catch (error: any) {
      console.error('Error checking account balance:', error);
      
      if (error.message?.includes('INVALID_ACCOUNT_ID')) {
        return reply.status(400).send({ 
          error: 'Account not found on Hedera network' 
        });
      }
      
      return reply.status(500).send({ 
        error: 'Failed to check account balance',
        details: error.message 
      });
    }
  });

  // Endpoint pour créer une transaction de paiement
  fastify.post('/create-payment', async (request: FastifyRequest<{ Body: PaymentRequestBody }>, reply: FastifyReply) => {
    try {
      const { amount, currency, userAccountId, purpose, parcelData } = request.body;

      if (!userAccountId) {
        return reply.status(400).send({ error: 'User account ID required' });
      }

      let accountId: AccountId;
      try {
        accountId = AccountId.fromString(userAccountId);
      } catch (error) {
        return reply.status(400).send({ error: 'Invalid user account ID format' });
      }

      if (purpose === 'parcel_mint' && amount !== MINT_FEE_USD) {
        return reply.status(400).send({ 
          error: `Invalid amount for parcel mint. Expected: $${MINT_FEE_USD}` 
        });
      }

      // Vérifier le solde avant de créer la transaction
      try {
        const accountBalance = await new AccountBalanceQuery()
          .setAccountId(accountId)
          .execute(hederaClient);

        // Correction: convertir correctement les tinybars
        const hbarBalance = Number(accountBalance.hbars.toTinybars()) / 100_000_000;
        const requiredHbar = currency === 'USD' ? amount * USD_TO_HBAR_RATE : amount;

        if (hbarBalance < requiredHbar) {
          return reply.status(400).send({
            error: 'Insufficient HBAR balance',
            required: requiredHbar,
            available: hbarBalance
          });
        }
      } catch (balanceError: any) {
        console.warn('Could not verify balance before payment creation:', balanceError.message);
      }

      const hbarAmount = currency === 'USD' ? amount * USD_TO_HBAR_RATE : amount;
      
      const transferTransaction = new TransferTransaction()
        .addHbarTransfer(userAccountId, Hbar.fromTinybars(-Math.floor(hbarAmount * 100_000_000)))
        .addHbarTransfer(OPERATOR_ACCOUNT_ID, Hbar.fromTinybars(Math.floor(hbarAmount * 100_000_000)))
        .setTransactionMemo(`Payment for ${purpose} - $${amount}`);

      const transactionBytes = transferTransaction.toBytes();
      const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const paymentDetails = {
        id: paymentId,
        userAccountId,
        amount,
        currency,
        hbarAmount,
        purpose,
        parcelData,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };

      return reply.send({
        success: true,
        paymentId,
        transactionBytes: Array.from(transactionBytes),
        details: {
          amountUSD: amount,
          amountHBAR: hbarAmount.toFixed(6),
          recipient: OPERATOR_ACCOUNT_ID,
          memo: `Payment for ${purpose} - $${amount}`,
          network: NETWORK
        }
      });

    } catch (error: any) {
      console.error('Error creating payment transaction:', error);
      return reply.status(500).send({ 
        error: 'Failed to create payment transaction',
        details: error.message 
      });
    }
  });

  // Endpoint pour vérifier le paiement après signature
  fastify.post('/verify-payment', async (request: FastifyRequest<{ Body: PaymentVerifyBody }>, reply: FastifyReply) => {
    try {
      const { transactionId, userAccountId, expectedAmount } = request.body;

      if (!transactionId || !userAccountId) {
        return reply.status(400).send({ error: 'Missing required parameters' });
      }

      console.log(`Verifying payment - Transaction: ${transactionId}, Account: ${userAccountId}, Expected: $${expectedAmount}`);

      let receipt: TransactionReceipt;
      let retries = 0;
      const maxRetries = 20;
      const retryDelay = 1500;

      console.log('Waiting for transaction consensus...');

      while (retries < maxRetries) {
        try {
          receipt = await TransactionId.fromString(transactionId).getReceipt(hederaClient);
          console.log(`Transaction confirmed after ${retries} retries:`, receipt.status.toString());
          break;
        } catch (error: any) {
          if (retries === maxRetries - 1) {
            console.error(`Transaction confirmation timeout after ${maxRetries * retryDelay / 1000} seconds`);
            
            return reply.send({
              success: false,
              pending: true,
              message: 'Transaction still pending confirmation',
              transactionId,
              retryAfter: 30
            });
          }
          
          if (retries % 5 === 0) {
            console.log(`Still waiting for transaction confirmation... (${retries}/${maxRetries})`);
          }
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retries++;
        }
      }

      if (receipt!.status.toString() !== 'SUCCESS') {
        console.error('Transaction failed with status:', receipt!.status.toString());
        return reply.status(400).send({ 
          error: 'Transaction failed',
          status: receipt!.status.toString()
        });
      }

      console.log('Transaction succeeded, verifying amounts...');

      let transactionRecord;
      let recordVerified = false;
      
      try {
        transactionRecord = await TransactionId.fromString(transactionId).getRecord(hederaClient);
        recordVerified = true;
      } catch (error: any) {
        console.warn('Could not get transaction record:', error.message);
        
        console.log('Accepting payment based on SUCCESS receipt without record verification');
        
        const paymentVerification = {
          transactionId,
          userAccountId,
          amount: expectedAmount,
          status: 'verified_without_record',
          verifiedAt: new Date(),
          receipt: {
            status: receipt!.status.toString(),
          }
        };

        return reply.send({
          success: true,
          payment: paymentVerification,
          message: 'Payment verified successfully (record check skipped)',
          warning: 'Could not verify exact amounts due to record access limitations'
        });
      }
      
      if (recordVerified) {
        const transfers = transactionRecord.transfers;
        const operatorTransfer = transfers.get(AccountId.fromString(OPERATOR_ACCOUNT_ID));
        const expectedHbarAmount = expectedAmount * USD_TO_HBAR_RATE;
        const expectedTinybars = Math.floor(expectedHbarAmount * 100_000_000);
        
        const tolerance = 5000;
        
        console.log('Transfer verification:', {
          operatorReceived: operatorTransfer?.toTinybars(),
          expectedTinybars,
          tolerance,
          difference: Math.abs(Number(operatorTransfer?.toTinybars() || 0) - expectedTinybars)
        });

        // Correction: convertir toTinybars() en number pour les opérations arithmétiques
        const receivedTinybars = Number(operatorTransfer?.toTinybars() || 0);
        const difference = Math.abs(receivedTinybars - expectedTinybars);

        if (!operatorTransfer || difference > tolerance) {
          console.warn('Payment amount mismatch (within tolerance check):', {
            expected: expectedHbarAmount,
            received: receivedTinybars / 100_000_000,
            difference,
            tolerance
          });
          
          if (difference < tolerance * 2) {
            console.log('Accepting payment despite small amount difference');
          } else {
            return reply.status(400).send({ 
              error: 'Payment amount mismatch',
              expected: expectedHbarAmount,
              received: receivedTinybars / 100_000_000
            });
          }
        }

        const paymentVerification = {
          transactionId,
          userAccountId,
          amount: expectedAmount,
          hbarAmount: receivedTinybars / 100_000_000 || expectedHbarAmount,
          status: 'verified',
          verifiedAt: new Date(),
          receipt: {
            status: receipt!.status.toString(),
            transactionHash: transactionRecord.transactionHash?.toString()
          }
        };

        return reply.send({
          success: true,
          payment: paymentVerification,
          message: 'Payment verified successfully'
        });
      }

    } catch (error: any) {
      console.error('Error verifying payment:', error);
      
      if (error.message?.includes('INVALID_TRANSACTION_ID')) {
        return reply.status(400).send({ 
          error: 'Invalid transaction ID format',
          details: error.message 
        });
      } else if (error.message?.includes('timeout') || error.message?.includes('pending')) {
        return reply.status(202).send({
          success: false,
          pending: true,
          error: 'Transaction verification timeout',
          message: 'Transaction may still be processing on Hedera network',
          retryAfter: 30
        });
      } else if (error.message?.includes('network') || error.message?.includes('connection')) {
        return reply.status(503).send({
          error: 'Network connectivity issue',
          details: 'Temporary network issue - please retry',
          retryAfter: 60
        });
      } else {
        return reply.status(500).send({ 
          error: 'Failed to verify payment',
          details: error.message 
        });
      }
    }
  });

  // Endpoint pour obtenir le taux de change actuel
  fastify.get('/exchange-rate', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      USD_to_HBAR: USD_TO_HBAR_RATE,
      mint_fee: {
        USD: MINT_FEE_USD,
        HBAR: MINT_FEE_HBAR
      },
      network: NETWORK,
      operator_account: OPERATOR_ACCOUNT_ID
    });
  });

  // Endpoint simple pour vérifier si un paiement peut être effectué
  fastify.post('/can-pay', async (request: FastifyRequest<{ 
    Body: { userAccountId: string } 
  }>, reply: FastifyReply) => {
    try {
      const { userAccountId } = request.body;
      
      if (!userAccountId) {
        return reply.status(400).send({ error: 'User account ID required' });
      }

      const balanceResponse = await fastify.inject({
        method: 'GET',
        url: `/api/payment/check-balance/${userAccountId}`
      });

      const balanceData = JSON.parse(balanceResponse.payload);

      if (!balanceData.success) {
        return reply.send({
          canPay: false,
          balance: 0,
          required: MINT_FEE_HBAR,
          error: balanceData.error
        });
      }

      return reply.send({
        canPay: balanceData.canPay,
        balance: balanceData.balance,
        required: balanceData.required
      });

    } catch (error) {
      return reply.send({
        canPay: false,
        balance: 0,
        required: MINT_FEE_HBAR,
        error: 'Could not verify balance'
      });
    }
  });

  // Endpoint de diagnostic
  fastify.get('/diagnostic', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const operatorBalance = await new AccountBalanceQuery()
        .setAccountId(AccountId.fromString(OPERATOR_ACCOUNT_ID))
        .execute(hederaClient);

      return reply.send({
        success: true,
        network: NETWORK,
        operator: {
          accountId: OPERATOR_ACCOUNT_ID,
          balance: Number(operatorBalance.hbars.toTinybars()) / 100_000_000
        },
        fees: {
          mintFeeUSD: MINT_FEE_USD,
          mintFeeHBAR: MINT_FEE_HBAR,
          exchangeRate: USD_TO_HBAR_RATE
        },
        client: {
          isConnected: true,
          networkNodes: hederaClient.network ? Object.keys(hederaClient.network).length : 0
        }
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: 'Hedera client connection failed',
        details: error.message
      });
    }
  });
}

export type { PaymentRequestBody, PaymentVerifyBody, BalanceCheckParams };