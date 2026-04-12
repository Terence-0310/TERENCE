import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export async function ensureWallet(userId: string) {
  let wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        balance: 0,
      },
    });
  }
  return wallet;
}

export async function getWalletOverview(userId: string) {
  const wallet = await ensureWallet(userId);
  return { balance: wallet.balance };
}

export async function listTransactions(userId: string, page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;
  
  const transactions = await prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  const total = await prisma.walletTransaction.count({
    where: { userId },
  });

  return { transactions, total, page, totalPages: Math.ceil(total / limit) };
}

interface CreditTopupParams {
  userId: string;
  orderId: string;
  amountCoin: number;
  provider: string; // "VIETQR"
  metadata?: any;
}

export async function creditTopup({ userId, orderId, amountCoin, provider, metadata }: CreditTopupParams) {
  return await prisma.$transaction(async (tx) => {
    // Lock the wallet for update if using Postgres? 
    // Prisma doesn't support SELECT FOR UPDATE directly easily unless using $executeRaw
    // But we can do an atomic update to prevent race conditions.
    
    // First, check if there is ALREADY a SUCCESS transaction for this order (Idempotency)
    const existingTx = await tx.walletTransaction.findFirst({
      where: {
        userId,
        type: 'TOPUP',
        referenceId: orderId,
        status: 'SUCCESS'
      }
    });

    if (existingTx) {
      throw new Error("This order has already been credited.");
    }

    // Ensure wallet exists
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      await tx.wallet.create({ data: { userId, balance: 0 } });
    }

    // Atomic increment
    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: amountCoin } }
    });

    // We can infer balance before from updatedWallet minus amountCoin
    const balanceAfter = updatedWallet.balance;
    const balanceBefore = balanceAfter - amountCoin;

    // Create the WalletTransaction record
    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: updatedWallet.id,
        userId,
        type: 'TOPUP',
        direction: 'CREDIT',
        amount: amountCoin,
        balanceBefore,
        balanceAfter,
        status: 'SUCCESS',
        provider,
        referenceType: 'TOPUP_ORDER',
        referenceId: orderId,
        title: `Nạp TCoin thành công`,
        description: `Nạp ${amountCoin} TCoin qua ${provider}`,
        metadata: metadata || Prisma.JsonNull,
      }
    });

    return { wallet: updatedWallet, transaction };
  });
}
