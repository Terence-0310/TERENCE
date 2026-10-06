import { prisma } from '@/lib/db/prisma';
import {
  buildVietQrImageUrl,
  buildSepayQrImageUrl,
  buildTransferInstructions,
  getActiveBankConfig,
} from '@/src/be/modules/payments/vietqr';
import { creditTopup } from './wallet.service';
import { calculateTCoinBonus } from '@/src/be/modules/tcoin/tcoin.service';
import { notifyUser } from '@/src/be/shared/realtime/notify';
import { getWalletOverview } from './wallet.service';

function generateShortCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for ( let i = 0; i < 8; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// 1.000đ = 10 TCoin. Single source of truth for the free-amount flow rate
// so the create endpoint, the docs, and reconciliation all use the same value.
const TCOIN_PER_VND = 10 / 1000
const MIN_TOPUP_VND = 1000        // floor on a single top-up
const MAX_TOPUP_VND = 100_000_000 // sanity cap (no single transfer over 100M VND)

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

  // Primary QR is the SePay-direct URL (`qr.sepay.vn`) so SePay's
  // reconciliation engine recognises the deposit. The user-visible bank
  // (MBBank by default per SEPAY_BANK_CODE) is whatever env says.
  const qrImageUrl = buildSepayQrImageUrl({
    amount: pkg.priceVnd,
    transferContent,
  });

  // Calculate dynamic bonus
  const calculated = calculateTCoinBonus(pkg.coinAmount)

  const order = await prisma.topupOrder.create({
    data: {
      userId,
      packageId,
      code,
      provider: 'BANK_QR',
      amountVnd: pkg.priceVnd,
      coinAmount: calculated.base,
      bonusAmount: calculated.bonus,
      transferContent,
      qrImageUrl,
      status: 'PENDING',
      expiresAt,
    }
  });

  const instructions = buildTransferInstructions(transferContent);

  return {
    id: order.id,
    code: order.code,
    status: order.status,
    amountVnd: order.amountVnd,
    coinAmount: order.coinAmount,
    bonusAmount: order.bonusAmount,
    qrImageUrl: order.qrImageUrl,
    expiresAt: order.expiresAt,
    // Legacy aliases — keep until all callers migrate.
    orderId: order.id,
    orderCode: order.code,
    // `instructions` provides transferContent + bankCode/accountNo/accountName.
    ...instructions
  };
}

/**
 * Resolve a TopupOrder from a raw bank transfer content, tolerant of banks
 * that strip underscores/spaces from the memo (so the real-world memo
 * "TCOINPDFYZ3SE" still maps to the stored "TCOIN_PDFYZ3SE").
 *
 * Scans recent orders (last 3 days, any status so duplicate webhooks on an
 * already-PAID order still resolve for idempotency) and returns the one whose
 * normalised transferContent is contained in the normalised bank content.
 * Returns null when nothing matches. The caller is responsible for the amount
 * guard and status checks.
 */
export async function findOrderByBankContent(content: string | null | undefined) {
  const { normalizeBankContent, contentMatchesTransfer } = await import('@/src/be/modules/payments/sepay');
  const norm = normalizeBankContent(content);
  if (!norm.includes('TCOIN')) return null;

  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const candidates = await prisma.topupOrder.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });
  return candidates.find((o) => contentMatchesTransfer(content, o.transferContent)) ?? null;
}

export async function getOrderById(id: string) {
  return await prisma.topupOrder.findUnique({ where: { id } });
}

export async function getOrderByCode(code: string) {
  return await prisma.topupOrder.findUnique({ where: { code } });
}

/**
 * Free-amount top-up flow (used by /api/payments/sepay/create).
 *
 * Differs from `createBankQrOrder` (the package flow) in two ways:
 *   1. The user picks the VND amount directly — no TCoinPackage lookup.
 *   2. The transfer content uses the format `TCOIN_<userId6>_<timestamp>`
 *      requested in the SePay onboarding spec, so SePay reconciliation can
 *      filter by the `TCOIN_` prefix.
 *
 * tcoinAmount is computed via TCOIN_PER_VND (10 TCoin per 1.000đ).
 *
 * Returns the inserted order plus both QR variants (VietQR + SePay-direct)
 * so the client can show whichever the integrator prefers.
 */
export async function createFreeAmountOrder(userId: string, amountVnd: number) {
  if (!Number.isFinite(amountVnd) || amountVnd < MIN_TOPUP_VND) {
    throw new Error(`Amount must be >= ${MIN_TOPUP_VND.toLocaleString('vi-VN')} VND`)
  }
  if (amountVnd > MAX_TOPUP_VND) {
    throw new Error(`Amount must be <= ${MAX_TOPUP_VND.toLocaleString('vi-VN')} VND`)
  }
  const rounded = Math.floor(amountVnd)
  const coinAmount = Math.floor(rounded * TCOIN_PER_VND)

  // Find or create the active TCoinPackage placeholder used by free-amount
  // orders — `TopupOrder.packageId` is non-null in the schema, so we anchor
  // every free-amount row to a single sentinel package called "FREE_AMOUNT".
  let pkg = await prisma.tCoinPackage.findUnique({ where: { slug: 'free-amount' } })
  if (!pkg) {
    pkg = await prisma.tCoinPackage.create({
      data: {
        slug: 'free-amount',
        name: 'Nạp tự chọn',
        coinAmount: 0,
        bonusAmount: 0,
        priceVnd: 0,
        isActive: false, // hidden from the package list shown to users
        sortOrder: 9999,
      },
    })
  }

  // Build a transferContent unique enough to identify the order on the bank
  // ledger. SePay matches on prefix "TCOIN_" then we look up by exact match.
  // `userId.slice(-6).toUpperCase()` keeps the code short while still
  // disambiguating the rare case of two users transferring at the same ms.
  const userTag = userId.slice(-6).toUpperCase()
  const ts = Date.now().toString(36).toUpperCase()
  const transferContent = `TCOIN_${userTag}_${ts}`

  // `code` is unique on TopupOrder — re-use the transferContent value so a
  // single string identifies the order both internally and on the bank.
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  const qrImageUrl = buildSepayQrImageUrl({ amount: rounded, transferContent })
  const qrVietQrUrl = buildVietQrImageUrl({ amount: rounded, transferContent })

  const order = await prisma.topupOrder.create({
    data: {
      userId,
      packageId: pkg.id,
      code: transferContent, // unique
      provider: 'BANK_QR',
      amountVnd: rounded,
      coinAmount,
      bonusAmount: 0,
      transferContent,
      qrImageUrl,
      status: 'PENDING',
      expiresAt,
    },
  })

  return {
    paymentId: order.id,
    code: order.code,
    transferContent: order.transferContent,
    amount: order.amountVnd,
    tcoinAmount: order.coinAmount,
    qrUrl: qrImageUrl,
    qrUrlVietQr: qrVietQrUrl,
    expiresAt: order.expiresAt,
    // Static bank info for users who want to copy/paste instead of scan QR.
    // Pulled from getActiveBankConfig() — single source of truth shared
    // with the QR builders, so the QR and the displayed bank info can never
    // drift apart.
    bankInfo: (() => {
      const { bankCode, bankAccount, accountName } = getActiveBankConfig()
      return { bank: bankCode, account: bankAccount, accountName }
    })(),
  }
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
  const { order: updatedOrder, alreadyPaid } = await prisma.$transaction(async (tx) => {
    // 1. Lock / Fetch Order
    const order = await tx.topupOrder.findUnique({
      where: { id: orderId }
    });

    if (!order) throw new Error("Order not found");

    // Check idempotent
    if (order.status === 'PAID') {
      return { order, alreadyPaid: true };
    }

    if (order.status !== 'PENDING') {
      throw new Error(`Cannot pay an order in status: ${order.status}`);
    }

    // 2. Mark Paid
    const updated = await tx.topupOrder.update({
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

    return { order: updated, alreadyPaid: false };
  });

  // 4. Push realtime event to the owning user (best-effort, never throws
  // — the wallet credit already committed). Skip on duplicate webhook delivery.
  if (!alreadyPaid) {
    let balance = 0;
    try {
      ({ balance } = await getWalletOverview(updatedOrder.userId));
      notifyUser(updatedOrder.userId, 'tcoin:paid', {
        orderId: updatedOrder.id,
        orderCode: updatedOrder.code,
        coinCredited: updatedOrder.coinAmount + updatedOrder.bonusAmount,
        balance,
      });
    } catch {
      // Realtime push is non-critical — UI polling fallback will catch up.
    }

    // 5. Receipt / invoice email — automatic confirmation. Best-effort: a mail
    // failure must never affect the already-committed credit nor the webhook
    // response. Only sent once (guarded by !alreadyPaid, so webhook retries on
    // a PAID order don't re-send).
    try {
      const [user, pkg] = await Promise.all([
        prisma.user.findUnique({
          where: { id: updatedOrder.userId },
          select: { email: true, name: true },
        }),
        prisma.tCoinPackage.findUnique({
          where: { id: updatedOrder.packageId },
          select: { name: true },
        }),
      ]);
      if (user?.email) {
        const { sendTopupReceiptEmail } = await import('@/lib/mail');
        await sendTopupReceiptEmail({
          email: user.email,
          name: user.name,
          orderCode: updatedOrder.code,
          packageName: pkg?.name || 'Nạp TCoin',
          amountVnd: updatedOrder.amountVnd,
          coinAmount: updatedOrder.coinAmount,
          bonusAmount: updatedOrder.bonusAmount,
          balanceAfter: balance,
          paidAt: new Date(),
        });
      }
    } catch {
      // Receipt email is non-critical — swallow so the payment flow is unaffected.
    }
  }

  return updatedOrder;
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
