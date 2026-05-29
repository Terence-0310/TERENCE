import nodemailer from "nodemailer";
import crypto from "crypto";
import { logger } from "@/src/be/shared/utils/logger";

const log = logger.child({ module: 'mail' });

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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

  await transporter.sendMail({
    from: fromAddress(),
    to: email,
    subject: "Đặt lại mật khẩu của bạn — TERENCE",
    html: buildHtmlEmail({
      title: "Khôi phục mật khẩu",
      greeting: "Yêu cầu đặt lại mật khẩu",
      message: "Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản TERENCE của bạn. Nhấn vào nút bên dưới để thiết lập mật khẩu mới ngay lập tức.",
      buttonText: "Đặt Lại Mật Khẩu",
      buttonUrl: resetLink,
      note: "Link khôi phục mật khẩu này sẽ <strong>hết hạn sau 15 phút</strong> vì lý do bảo mật. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.",
    }),
  });
};

/** Send email verification link after registration */
export const sendVerificationEmail = async (email: string, token: string, name?: string) => {
  const verifyLink = `${appUrl()}/verify-email?token=${token}`;

  // Log link to console for local testing
  if (process.env.NODE_ENV !== "production" || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    log.info({ to: email, verifyLink }, 'Lệnh Gửi Email Mô Phỏng (Local Test)');
  }

  await transporter.sendMail({
    from: fromAddress(),
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
  });
};

