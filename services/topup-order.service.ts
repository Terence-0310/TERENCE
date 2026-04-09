import { prisma } from '@/lib/db/prisma';
import { buildVietQrImageUrl, buildTransferInstructions } from '@/lib/payments/vietqr';
import { creditTopup } from './wallet.service';

function generateShortCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for ( let i = 0; i < 8; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export async function createBankQrOrder(userId: string, packageId: string) {
  // Validate package
  const pkg = await prisma.tCoinPackage.findUnique({
    where: { id: packageId, isActive: true }
  });

  if (!pkg) {
    throw new Error('Package not found or inactive');
  }

  // Ensure unique code
  let code = '';
  let isUnique = false;
  while (!isUnique) {
    code = generateShortCode();
    const existing = await prisma.topupOrder.findUnique({ where: { code } });
    if (!existing) isUnique = true;
  }

  const transferContent = `TCOIN_${code}`;
  
  // Set expiry to 15 minutes
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  const qrImageUrl = buildVietQrImageUrl({
    amount: pkg.priceVnd,
    transferContent
  });

  const order = await prisma.topupOrder.create({
    data: {
      userId,
      packageId,
      code,
      provider: 'BANK_QR',
      amountVnd: pkg.priceVnd,
      coinAmount: pkg.coinAmount,
      bonusAmount: pkg.bonusAmount,
      transferContent,
      qrImageUrl,
      status: 'PENDING',
      expiresAt,
    }
  });

  const instructions = buildTransferInstructions(code);

  return {
    orderId: order.id,
    orderCode: order.code,
    amountVnd: order.amountVnd,
    qrImageUrl: order.qrImageUrl,
    expiresAt: order.expiresAt,
    ...instructions
  };
}

export async function getOrderById(id: string) {
  return await prisma.topupOrder.findUnique({ where: { id } });
}

export async function getOrderByCode(code: string) {
  return await prisma.topupOrder.findUnique({ where: { code } });
}

export interface BankTxnData {
  matchedBankTxnId: string;
  matchedBankAccount: string;
  matchedBankAmount: number;
  matchedBankContent: string;
  provider: string; // SEPAY
  rawPayload: any;
}

export async function markOrderPaid(orderId: string, txnData: BankTxnData) {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock / Fetch Order
    const order = await tx.topupOrder.findUnique({
      where: { id: orderId }
    });

    if (!order) throw new Error("Order not found");
    
    // Check idempotent
    if (order.status === 'PAID') {
      return order; // Already paid
    }

    if (order.status !== 'PENDING') {
      throw new Error(`Cannot pay an order in status: ${order.status}`);
    }

    // 2. Mark Paid
    const updatedOrder = await tx.topupOrder.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        matchedBankTxnId: txnData.matchedBankTxnId,
        matchedBankAccount: txnData.matchedBankAccount,
        matchedBankAmount: txnData.matchedBankAmount,
        matchedBankContent: txnData.matchedBankContent,
      }
    });

    // 3. Credit User Wallet
    await creditTopup({
      userId: order.userId,
      orderId: order.id,
      amountCoin: order.coinAmount + order.bonusAmount,
      provider: txnData.provider,
      metadata: txnData.rawPayload
    });

    return updatedOrder;
  });
}

export async function expireStaleOrders() {
  const result = await prisma.topupOrder.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: {
        lt: new Date()
      }
    },
    data: {
      status: 'EXPIRED'
    }
  });
  return result;
}
