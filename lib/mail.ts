import nodemailer from "nodemailer";
import crypto from "crypto";
import { logger } from "@/src/be/shared/utils/logger";

const log = logger.child({ module: 'mail' });

const smtpPort = Number(process.env.SMTP_PORT) || 465;

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: smtpPort,
  // 465 = implicit TLS; 587/25 = STARTTLS (secure must be false there).
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const smtpConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

/**
 * Send through SMTP, or — when SMTP is not configured (local dev) — just log
 * the message so flows like password reset keep working without a mailbox.
 */
async function deliver(mail: { to: string; subject: string; html: string }, devInfo: Record<string, unknown>) {
  if (!smtpConfigured()) {
    log.info({ to: mail.to, subject: mail.subject, ...devInfo }, "SMTP chưa cấu hình — bỏ qua gửi email (dev)");
    return;
  }
  await transporter.sendMail({ from: fromAddress(), ...mail });
}

const fromAddress = () =>
  `"${process.env.EMAIL_FROM_NAME || "TERENCE"}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`;

const appUrl = () => process.env.APP_URL || "http://localhost:3000";

/** Generate a crypto-secure token */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/** Base HTML Template for all emails */
const buildHtmlEmail = ({
  title,
  greeting,
  message,
  buttonText,
  buttonUrl,
  note,
}: {
  title: string;
  greeting?: string;
  message: string;
  buttonText: string;
  buttonUrl: string;
  note: string;
}) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #2dd4bf; font-size: 32px; font-weight: 900; letter-spacing: -0.5px;">TERENCE</h1>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px; letter-spacing: 0.5px;">Premium Streaming Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              ${greeting ? `<h2 style="margin: 0 0 16px; font-size: 22px; color: #0f172a; font-weight: 800;">${greeting}</h2>` : ''}
              
              <p style="margin: 0 0 30px; color: #475569; font-size: 15px; line-height: 1.6;">
                ${message}
              </p>

              <!-- Action Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom: 30px;">
                    <a href="${buttonUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #2dd4bf, #14b8a6); color: #022c22; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 8px 20px rgba(45, 212, 191, 0.3);">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 24px;" />

              <!-- Note -->
              <p style="margin: 0 0 12px; color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
                ${note}
              </p>

              <!-- Fallback Link -->
              <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; word-break: break-all; text-align: center;">
                <p style="margin: 0; color: #94a3b8; font-size: 11px;">Nếu nút không hoạt động, hãy copy link này vào trình duyệt:</p>
                <a href="${buttonUrl}" style="color: #14b8a6; font-size: 11px; text-decoration: underline;">${buttonUrl}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px; font-weight: 500;">&copy; ${new Date().getFullYear()} TERENCE. All rights reserved.</p>
              <p style="margin: 4px 0 0; color: #cbd5e1; font-size: 11px;">Email này được gửi tự động, vui lòng không trả lời.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${appUrl()}/reset-password?token=${token}`;

  await deliver({
    to: email,
    subject: "Đặt lại mật khẩu của bạn — TERENCE",
    html: buildHtmlEmail({
      title: "Khôi phục mật khẩu",
      greeting: "Yêu cầu đặt lại mật khẩu",
      message: "Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản TERENCE của bạn. Nhấn vào nút bên dưới để thiết lập mật khẩu mới ngay lập tức.",
      buttonText: "Đặt Lại Mật Khẩu",
      buttonUrl: resetLink,
      note: "Link khôi phục mật khẩu này sẽ <strong>hết hạn sau 1 giờ</strong> vì lý do bảo mật. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.",
    }),
  }, { resetLink });
};

/** Send email verification link after registration */
export const sendVerificationEmail = async (email: string, token: string, name?: string) => {
  const verifyLink = `${appUrl()}/verify-email?token=${token}`;

  await deliver({
    to: email,
    subject: "Xác thực tài khoản của bạn — TERENCE",
    html: buildHtmlEmail({
      title: "Xác thực Email",
      greeting: `Chào ${name || "bạn"},`,
      message: "Cảm ơn bạn đã tham gia cộng đồng TERENCE! Để kích hoạt tài khoản và bắt đầu thưởng thức hàng ngàn bộ phim bản quyền, vui lòng xác thực địa chỉ email của bạn.",
      buttonText: "Kích Hoạt Tài Khoản",
      buttonUrl: verifyLink,
      note: "Link xác thực này sẽ <strong>hết hạn sau 24 giờ</strong>. Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này.",
    }),
  }, { verifyLink });
};

/**
 * Send a TCoin top-up receipt/invoice after a payment is confirmed (automatic
 * SePay webhook, admin manual confirm, or free-amount). Best-effort — callers
 * should not block the payment flow on delivery.
 */
export const sendTopupReceiptEmail = async (params: {
  email: string;
  name?: string | null;
  orderCode: string;
  packageName: string;
  amountVnd: number;
  coinAmount: number;
  bonusAmount: number;
  balanceAfter: number;
  paidAt: Date;
}) => {
  const {
    email, name, orderCode, packageName,
    amountVnd, coinAmount, bonusAmount, balanceAfter, paidAt,
  } = params;

  const total = coinAmount + bonusAmount;
  const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
  const coin = (n: number) => `${n.toLocaleString("vi-VN")} TCoin`;
  const bonusPct =
    bonusAmount > 0 && coinAmount > 0
      ? ` (+${Math.round((bonusAmount / coinAmount) * 100)}%)`
      : "";
  const paidAtLabel = paidAt.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const year = new Date().getFullYear();
  const walletUrl = `${appUrl()}/tcoin`;

  // A single line item in the itemised section.
  const lineItem = (label: string, value: string, opts?: { last?: boolean; muted?: boolean }) => `
    <tr>
      <td style="padding:11px 0;color:${opts?.muted ? "#94a3b8" : "#475569"};font-size:14px;${opts?.last ? "" : "border-bottom:1px solid #f1f5f9;"}">${label}</td>
      <td align="right" style="padding:11px 0;color:#0f172a;font-size:14px;font-weight:600;${opts?.last ? "" : "border-bottom:1px solid #f1f5f9;"}">${value}</td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Biên lai thanh toán TCoin</title>
</head>
<body style="margin:0;padding:0;background:#eef2f6;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Biên lai nạp ${coin(total)} — đơn ${orderCode} đã thanh toán thành công.</div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#eef2f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 14px 40px rgba(15,23,42,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#134e4a 100%);padding:30px 36px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size:26px;font-weight:900;color:#2dd4bf;letter-spacing:-0.5px;">TERENCE</td>
                  <td align="right" style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Biên lai điện tử</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status + greeting -->
          <tr>
            <td style="padding:30px 36px 0;">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr><td style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:999px;padding:7px 16px;color:#047857;font-size:12px;font-weight:800;letter-spacing:0.3px;">&#10003;&nbsp; THANH TOÁN THÀNH CÔNG</td></tr>
              </table>
              <h1 style="margin:18px 0 6px;font-size:21px;color:#0f172a;font-weight:800;">Chào ${name || "bạn"},</h1>
              <p style="margin:0;color:#64748b;font-size:14px;line-height:1.65;">Giao dịch của bạn đã được xác nhận tự động. <strong style="color:#0f172a;">${coin(total)}</strong> đã được cộng vào ví TCoin của bạn.</p>
            </td>
          </tr>

          <!-- Amount hero -->
          <tr>
            <td style="padding:24px 36px 0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-weight:800;">Số tiền đã thanh toán</div>
                    <div style="color:#0f172a;font-size:32px;font-weight:900;margin-top:6px;line-height:1;">${vnd(amountVnd)}</div>
                    <div style="color:#94a3b8;font-size:12px;margin-top:8px;">Chuyển khoản ngân hàng &middot; VietQR</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Itemised details -->
          <tr>
            <td style="padding:24px 36px 0;">
              <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-weight:800;margin-bottom:6px;">Chi tiết đơn hàng</div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                ${lineItem("Mã đơn", `<span style="font-family:'Courier New',monospace;letter-spacing:0.5px;">${orderCode}</span>`)}
                ${lineItem("Gói nạp", packageName)}
                ${lineItem("TCoin gốc", coin(coinAmount))}
                ${bonusAmount > 0 ? lineItem(`Bonus${bonusPct}`, `<span style="color:#059669;font-weight:700;">+${coin(bonusAmount)}</span>`) : ""}
                ${lineItem("Thời gian", paidAtLabel, { last: true, muted: true })}
              </table>
            </td>
          </tr>

          <!-- Total -->
          <tr>
            <td style="padding:16px 36px 0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top:2px solid #0f172a;">
                <tr>
                  <td style="padding:14px 0 0;color:#0f172a;font-size:15px;font-weight:800;">Tổng TCoin nhận</td>
                  <td align="right" style="padding:14px 0 0;color:#0d9488;font-size:22px;font-weight:900;">${coin(total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Wallet balance -->
          <tr>
            <td style="padding:18px 36px 0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;">
                <tr>
                  <td style="padding:14px 18px;color:#0f766e;font-size:13px;font-weight:600;">Số dư ví sau giao dịch</td>
                  <td align="right" style="padding:14px 18px;color:#0f766e;font-size:16px;font-weight:800;">${coin(balanceAfter)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:28px 36px 6px;">
              <a href="${walletUrl}" style="display:inline-block;background:linear-gradient(135deg,#2dd4bf,#14b8a6);color:#022c22;text-decoration:none;font-weight:800;font-size:15px;padding:14px 40px;border-radius:12px;box-shadow:0 8px 20px rgba(45,212,191,0.35);">Xem ví TCoin &rarr;</a>
            </td>
          </tr>

          <!-- Note -->
          <tr>
            <td style="padding:20px 36px 0;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;" />
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">Đây là biên lai điện tử cho giao dịch nạp TCoin tại TERENCE. Nếu bạn <strong>không</strong> thực hiện giao dịch này, vui lòng liên hệ hỗ trợ ngay để được trợ giúp.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:22px 36px;border-top:1px solid #eef2f7;text-align:center;">
              <p style="margin:0;color:#64748b;font-size:12px;font-weight:700;">TERENCE &middot; Premium Streaming Platform</p>
              <p style="margin:6px 0 0;color:#cbd5e1;font-size:11px;">&copy; ${year} TERENCE. Email được gửi tự động, vui lòng không trả lời.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await deliver(
    { to: email, subject: `Biên lai nạp ${coin(total)} — Đơn ${orderCode} — TERENCE`, html },
    { orderCode, total },
  );
};

