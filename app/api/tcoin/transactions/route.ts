import { NextRequest } from 'next/server';
import { TcoinController } from '@/src/be/modules/tcoin/tcoin.controller';
export async function GET(req: NextRequest) { return TcoinController.getTransactions(req); }
