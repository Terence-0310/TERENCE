import { NextRequest } from 'next/server';
import { TcoinController } from '@/src/be/modules/tcoin/tcoin.controller';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return TcoinController.checkOrderStatus(req, context);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return TcoinController.cancelOrder(req, context);
}
