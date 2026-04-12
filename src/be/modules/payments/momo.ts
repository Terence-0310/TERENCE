import crypto from 'crypto';

export async function generateMoMoPayment(orderId: string, orderCode: string, amount: number) {
  // If merchant config is present, do real integration. Otherwise fallback to simple QR format.
  const partnerCode = process.env.MOMO_PARTNER_CODE;
  
  if (partnerCode && process.env.MOMO_ACCESS_KEY && process.env.MOMO_SECRET_KEY) {
    // Official MoMo Business API
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const redirectUrl = process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/tcoin?status=success';
    const ipnUrl = process.env.MOMO_IPN_URL || 'https://domain.com/api/momo/ipn';
    const endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
    
    const orderInfo = `Nạp TCoin mã \${orderCode}`;
    const requestId = orderId;
    const rawSignature = `accessKey=\${accessKey}&amount=\${amount}&extraData=&ipnUrl=\${ipnUrl}&orderId=\${orderCode}&orderInfo=\${orderInfo}&partnerCode=\${partnerCode}&redirectUrl=\${redirectUrl}&requestId=\${requestId}&requestType=captureWallet`;
    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerCode, partnerName: "TERENCE", storeId: "MomoTestStore", requestId, amount,
        orderId: orderCode, orderInfo, redirectUrl, ipnUrl, lang: "vi", requestType: "captureWallet",
        autoCapture: true, extraData: "", signature
      })
    });
    const json = await res.json();
    if (json.resultCode === 0) return json.payUrl;
  }
  
  // Fallback for students / normal users: Personal MoMo QR
  // Format: 2|99|Phone|Name|Email|0|0|Amount|Message
  const phone = '0941234567'; // Replace with real sequence if known
  const momoUrl = `2|99|\${phone}|||0|0|\${amount}|TCOIN \${orderCode}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=\${encodeURIComponent(momoUrl)}&margin=15`;
}

export function verifyMoMoSignature(data: any): boolean {
  const secretKey = process.env.MOMO_SECRET_KEY;
  if (!secretKey) return false;

  const rawSignature = `accessKey=\${process.env.MOMO_ACCESS_KEY}&amount=\${data.amount}&extraData=\${data.extraData}&message=\${data.message}&orderId=\${data.orderId}&orderInfo=\${data.orderInfo}&orderType=\${data.orderType}&partnerCode=\${data.partnerCode}&payType=\${data.payType}&requestId=\${data.requestId}&responseTime=\${data.responseTime}&resultCode=\${data.resultCode}&transId=\${data.transId}`;
  const signature = crypto.createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  return signature === data.signature;
}
