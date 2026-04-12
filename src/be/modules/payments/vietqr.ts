/**
 * Cấu hình VietQR để tạo mã QR tự động
 */

const VIETQR_BANK_ID = process.env.VIETQR_BANK_ID || '970415'; // VietinBank default
const VIETQR_ACCOUNT_NO = process.env.VIETQR_ACCOUNT_NO || '100600272094';
const VIETQR_ACCOUNT_NAME = process.env.VIETQR_ACCOUNT_NAME || 'NGUYEN DUC ANH TAI';
const VIETQR_TEMPLATE = process.env.VIETQR_TEMPLATE || 'compact2';

export interface VietQrConfig {
  amount: number;
  transferContent: string;
}

export function buildVietQrImageUrl({ amount, transferContent }: VietQrConfig): string {
  // VietQR URL format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png
  // Params: ?amount=&addInfo=&accountName=
  const baseUrl = `https://img.vietqr.io/image/${VIETQR_BANK_ID}-${VIETQR_ACCOUNT_NO}-${VIETQR_TEMPLATE}.png`;
  
  const params = new URLSearchParams({
    amount: amount.toString(),
    addInfo: transferContent,
    accountName: VIETQR_ACCOUNT_NAME
  });

  return `${baseUrl}?${params.toString()}`;
}

export function buildTransferInstructions(orderCode: string) {
  return {
    bankCode: VIETQR_BANK_ID,
    accountNo: VIETQR_ACCOUNT_NO,
    accountName: VIETQR_ACCOUNT_NAME,
    transferContent: `TCOIN_${orderCode}`,
  };
}
