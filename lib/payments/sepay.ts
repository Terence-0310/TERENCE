export interface SePayWebhookPayload {
  id: number;
  gateway: string;
  transactionDate: string; // "YYYY-MM-DD HH:mm:ss"
  accountNumber: string;
  subAccount: string | null;
  transferType: "in" | "out";
  transferAmount: number;
  accumulated: number;
  code: string | null;
  content: string;
  referenceCode: string | null;
  description: string;
}

export function verifySePaySignature(payload: any, signature: string | null): boolean {
  // If no secret is configured, just accept for development
  const secret = process.env.SEPAY_WEBHOOK_SECRET;
  if (!secret) return true;

  // Ideally, SePay uses a Bearer token or HMAC for signature depending on config.
  // In a real scenario, compare the signature against header.
  if (signature === secret || signature === `Bearer ${secret}`) {
    return true;
  }
  
  return false;
}
