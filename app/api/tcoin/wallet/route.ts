import { TcoinController } from '@/src/be/modules/tcoin/tcoin.controller';
export async function GET() { return TcoinController.getWallet(); }
