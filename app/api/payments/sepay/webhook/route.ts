import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { SePayWebhookPayload, verifySePaySignature } from '@/src/be/modules/payments/sepay';
import { markOrderPaid } from '@/src/be/services/topup-order.service';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headers = req.headers;
    const authHeader = headers.get('authorization') || '';

    let payload: SePayWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // 1. Log webhook
    await prisma.bankWebhookLog.create({
      data: {
        provider: 'SEPAY',
        rawPayload: JSON.parse(rawBody),
        signature: authHeader,
      }
    });

    // 2. Verify signature
    if (!verifySePaySignature(payload, authHeader)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. We only care about "in" (Receive Money)
    if (payload.transferType !== 'in') {
      return NextResponse.json({ message: 'Ignored non-in transfer' });
    }

    // 4. Try to find the matching Order
    // The content usually contains "TCOIN_XYZ123". 
    // We can extract it.
    const contentText = payload.content.toUpperCase();
    
    // Instead of parsing, let's find a PENDING order where its transferContent is exactly included in the bank content
    // Because Bank often prefixes something or trims something, `contains` is safer.
    
    // Find all pending orders (normally not many)
    const pendingOrders = await prisma.topupOrder.findMany({
      where: {
        status: 'PENDING'
      }
    });

    let matchedOrder = null;
    for (const order of pendingOrders) {
      // Check if order.transferContent is inside the bank transfer content
      if (contentText.includes(order.transferContent.toUpperCase())) {
        // Must match exact amount to be valid!
        if (order.amountVnd === payload.transferAmount) {
          matchedOrder = order;
          break;
        }
      }
    }

    if (!matchedOrder) {
      // Not an error, just no maching order found
      return NextResponse.json({ message: 'No matching order found' });
    }

    // 5. Mark as Paid and Credit Wallet!
    await markOrderPaid(matchedOrder.id, {
      matchedBankTxnId: payload.id.toString(),
      matchedBankAccount: payload.accountNumber,
      matchedBankAmount: payload.transferAmount,
      matchedBankContent: payload.content,
      provider: 'SEPAY',
      rawPayload: JSON.parse(rawBody),
    });

    return NextResponse.json({ success: true, orderId: matchedOrder.id });
  } catch (error: any) {
    console.error('SePay webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
