import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { markOrderPaid, getOrderByCode } from '@/services/topup-order.service';
import { verifyMoMoSignature } from '@/lib/payments/momo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Log webhook payload for safety
    await prisma.bankWebhookLog.create({
      data: {
        provider: 'momo',
        rawPayload: body as any
      }
    });

    // 2. Security Check: verify signature
    if (!verifyMoMoSignature(body)) {
      return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
    }

    // 3. Process payment if success
    if (body.resultCode === 0) {
      const orderCode = body.orderId; // MoMo returns orderCode as orderId
      const order = await getOrderByCode(orderCode);
      if (order && order.status === 'PENDING') {
        await markOrderPaid(order.id, {
          matchedBankTxnId: body.transId?.toString() || new Date().getTime().toString(),
          matchedBankAccount: 'MOMO',
          matchedBankAmount: body.amount,
          matchedBankContent: body.orderInfo,
          provider: 'MOMO',
          rawPayload: body
        });
      }
    }

    // Always 200 OK so MoMo doesn't spam retry unless 500 error
    return NextResponse.json({ message: 'OK' }, { status: 200 });

  } catch (error: any) {
    console.error('MoMo IPN Error:', error);
    // Returning 200 with error log is sometimes better for idempotent endpoints if failure is manual intervention
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
