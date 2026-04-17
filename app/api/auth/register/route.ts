import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/be/shared/db/prisma";
import { AuthService } from "@/src/be/modules/auth";
import { generateToken, sendVerificationEmail } from "@/lib/mail";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  captchaToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { name, email, password, captchaToken } = result.data;

    // Verify Turnstile
    if (process.env.TURNSTILE_SECRET_KEY && captchaToken) {
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=\${process.env.TURNSTILE_SECRET_KEY}&response=\${captchaToken}`,
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return NextResponse.json({ error: "Xác minh Captcha thất bại" }, { status: 400 });
      }
    } else if (process.env.TURNSTILE_SECRET_KEY) {
      return NextResponse.json({ error: "Vui lòng xác minh không phải robot" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email đã được sử dụng" }, { status: 400 });
    }

    const hashedPassword = await AuthService.hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash: hashedPassword,
        role: "USER",
        isActive: true,
        isEmailVerified: false,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    // ── Send verification email (non-blocking) ──
    let emailSent = false;
    try {
      // Clean up any stale tokens for this email
      await prisma.verificationToken.deleteMany({
        where: { identifier: email.toLowerCase() },
      });

      const token = generateToken();
      await prisma.verificationToken.create({
        data: {
          identifier: email.toLowerCase(),
          token,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      });

      await sendVerificationEmail(email.toLowerCase(), token, name);
      emailSent = true;
    } catch (mailError) {
      // Log but don't block registration
      console.error("Failed to send verification email during registration:", mailError);
    }

    return NextResponse.json({
      user,
      message: emailSent
        ? "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản."
        : "Đăng ký thành công! Bạn có thể yêu cầu gửi lại email xác thực sau.",
      emailSent,
    });
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

