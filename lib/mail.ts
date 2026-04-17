import nodemailer from "nodemailer";
import crypto from "crypto";

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

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${appUrl()}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: fromAddress(),
    to: email,
    subject: "Đặt lại mật khẩu của bạn",
    html: `
      <h2>Khôi phục mật khẩu</h2>
      <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản TERENCE của bạn.</p>
      <p>Vui lòng click vào link bên dưới để tạo mật khẩu mới:</p>
      <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #0b9e84; color: white; text-decoration: none; border-radius: 5px;">Đặt lại mật khẩu</a>
      <p>Link này sẽ hết hạn trong 15 phút.</p>
      <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
    `,
  });
};

/** Send email verification link after registration */
export const sendVerificationEmail = async (email: string, token: string, name?: string) => {
  const verifyLink = `${appUrl()}/verify-email?token=${token}`;

  // Log link to console for local testing (so developers don't need real SMTP setup)
  if (process.env.NODE_ENV !== "production" || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("\n==============================================");
    console.log("📨 Lệnh Gửi Email Mô Phỏng (Local Test)");
    console.log("To:", email);
    console.log("Verify Link:", verifyLink);
    console.log("==============================================\n");
  }

  await transporter.sendMail({
    from: fromAddress(),
    to: email,
    subject: "Xác thực email — TERENCE",
    html: `
      <div style="max-width: 520px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; color: #2dd4bf; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">TERENCE</h1>
          <p style="margin: 8px 0 0; color: #94a3b8; font-size: 13px;">Nền tảng xem phim trực tuyến</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px;">
          <h2 style="margin: 0 0 8px; font-size: 20px; color: #0f172a;">Chào ${name || "bạn"},</h2>
          <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.6;">
            Cảm ơn bạn đã đăng ký tài khoản TERENCE! Vui lòng xác thực email của bạn bằng cách nhấn nút bên dưới:
          </p>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${verifyLink}"
               style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #2dd4bf, #14b8a6); color: #022c22; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(45, 212, 191, 0.4);">
              Xác thực Email
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 20px 0 0;">
            Link xác thực có hiệu lực trong <strong style="color: #475569;">24 giờ</strong>.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

          <p style="color: #94a3b8; font-size: 11px; line-height: 1.5;">
            Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này.<br/>
            Hoặc nếu nút không hoạt động, hãy copy link sau vào trình duyệt:<br/>
            <a href="${verifyLink}" style="color: #2dd4bf; word-break: break-all;">${verifyLink}</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #94a3b8; font-size: 11px;">&copy; ${new Date().getFullYear()} TERENCE. All rights reserved.</p>
        </div>
      </div>
    `,
  });
};

