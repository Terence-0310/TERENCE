import { TcoinController } from '@/src/be/modules/tcoin/tcoin.controller';
export async function POST() { return TcoinController.dailyCheckin(); }
