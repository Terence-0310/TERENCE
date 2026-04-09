import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWalletOverview } from '@/services/wallet.service';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get Wallet Balance
    const overview = await getWalletOverview(userId);

    // 2. Get active TCoin Packages
    const packages = await prisma.tCoinPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    // 3. Get Recent Transactions (max 5)
    const recentTransactions = await prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // 4. Check for active pending orders
    const activeOrder = await prisma.topupOrder.findFirst({
      where: {
        userId,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      balance: overview.balance,
      packages,
      recentTransactions,
      activeOrder
    });
  } catch (error: any) {
    console.error('Error fetching tcoin overview:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
