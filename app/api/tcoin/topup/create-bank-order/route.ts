import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createBankQrOrder, expireStaleOrders } from '@/services/topup-order.service';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional: Clean up stale orders automatically before creating new one
    await expireStaleOrders().catch(e => console.error(e));

    const body = await req.json();
    if (!body.packageId) {
      return NextResponse.json({ error: 'packageId is required' }, { status: 400 });
    }

    const orderData = await createBankQrOrder(userId, body.packageId);

    return NextResponse.json(orderData);
  } catch (error: any) {
    console.error('Error creating bank order:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
