import { NextRequest } from 'next/server';
import { TcoinController } from '@/src/be/modules/tcoin/tcoin.controller';
export async function POST(req: NextRequest) { return TcoinController.spend(req); }
