import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/be/shared/db/prisma";
import { AuthService } from "@/src/be/modules/auth";
import { Adapter } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login", // Error code passed in query string as ?error=
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: "USER",
          isActive: true,
          isEmailVerified: true,
        }
      },
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() }
        });

        if (!user) {
          throw new Error("User not found");
        }

        if (!user.isActive) {
          throw new Error("Tài khoản đã bị khóa");
        }

        if (!user.passwordHash) {
          throw new Error("Vui lòng đăng nhập bằng Google");
        }

        const isValid = await AuthService.verifyPassword(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error("Sai mật khẩu");
        }

        return user as any;
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        });

        if (existingUser) {
          if (!existingUser.isActive) {
            return "/login?error=BlockAccount";
          }
          // The Prisma adapter will automatically link the account to this user
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "USER";
        token.isActive = (user as any).isActive ?? true;
        
        try {
          const { getUserEffectivePermissions } = await import('@/src/lib/permissions/access-control');
          const perms = await getUserEffectivePermissions(user.id, (user as any).role || "USER");
          token.permissions = perms.map(p => p.key);
        } catch(e) {
          token.permissions = [];
        }
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
        if (session.picture) token.picture = session.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).isActive = token.isActive;
        (session.user as any).permissions = token.permissions || [];
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};
