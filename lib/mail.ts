import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "TERENCE"}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
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
