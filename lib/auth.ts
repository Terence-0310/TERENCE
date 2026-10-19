import { NextAuthOptions, type User as NextAuthUser } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/be/shared/db/prisma";
import { AuthService } from "@/src/be/modules/auth";
import { Adapter } from "next-auth/adapters";
import * as AuthRepository from "@/src/be/modules/auth/auth.repository";
import { getAccountStatus } from "@/src/be/modules/auth/account-status";

const googleAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
)

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
    ...(googleAuthConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
        ]
      : []),
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

        const user = await AuthRepository.findUserByEmail(credentials.email);

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

        // Map Prisma user → NextAuth User. Fields beyond the defaults
        // (role, isActive, isEmailVerified) are declared in types/next-auth.d.ts.
        const authUser: NextAuthUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image ?? null,
          role: user.role,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
        };
        return authUser;
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        const existingUser = await AuthRepository.findUserByEmail(user.email);

        if (existingUser) {
          if (!existingUser.isActive) {
            return "/login?error=BlockAccount";
          }
          // The Prisma adapter will automatically link the account to this user
        }

        // Google verifies the email at sign-up, so credit the one-time
        // "Xác minh email" TCoin reward. Idempotent — the service refuses to
        // credit twice — so this is safe on every sign-in.
        try {
          const u = existingUser ?? await AuthRepository.findUserByEmail(user.email)
          if (u?.id) {
            const { rewardVerifyEmail } = await import('@/src/be/modules/tcoin/tcoin.service')
            await rewardVerifyEmail(u.id)
          }
        } catch {
          /* best-effort — never block sign-in on a reward failure */
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
        token.isActive = user.isActive ?? true;
        token.isEmailVerified = user.isEmailVerified ?? false;

        // Seed the token picture from the user's editable `avatar` (the field
        // the profile page writes to), falling back to the OAuth `image`. This
        // makes the header show the correct avatar right after login for both
        // credentials and Google users — the header reads session.user.image,
        // which derives from token.picture.
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { avatar: true, image: true },
          });
          token.picture = dbUser?.avatar ?? dbUser?.image ?? user.image ?? null;
        } catch {
          /* keep whatever NextAuth already set on token.picture */
        }

        try {
          const { getUserEffectivePermissions } = await import('@/src/lib/permissions/access-control');
          const perms = await getUserEffectivePermissions(user.id, token.role);
          token.permissions = perms.map(p => p.key);
        } catch (err) {
          // Don't lock the user out silently — fall back to empty permissions
          // but surface the failure so it can be diagnosed.
          console.error('[Auth] Failed to load effective permissions for user', user.id, err);
          token.permissions = [];
        }
      } else if (token.id) {
        // Re-validate on every session read so admin block / role changes
        // apply without waiting for re-login. Throwing makes NextAuth clear
        // the session cookie and return an empty session.
        let status: Awaited<ReturnType<typeof getAccountStatus>> | undefined;
        try {
          status = await getAccountStatus(token.id);
        } catch {
          /* DB hiccup — keep the current token rather than logging everyone out */
        }
        if (status === null || status?.active === false) {
          throw new Error("ACCOUNT_DISABLED");
        }
        if (status) {
          token.isEmailVerified = status.isEmailVerified;
          if (status.role !== token.role) {
            token.role = status.role as typeof token.role;
            try {
              const { getUserEffectivePermissions } = await import('@/src/lib/permissions/access-control');
              token.permissions = (await getUserEffectivePermissions(token.id, token.role)).map(p => p.key);
            } catch {
              token.permissions = [];
            }
          }
        }
      }
      // useSession().update({ name, picture }) from the profile page lands here
      // so avatar/name edits reflect in the header without a re-login.
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.picture !== undefined) token.picture = session.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.isActive = token.isActive;
        session.user.isEmailVerified = token.isEmailVerified;
        session.user.permissions = token.permissions ?? [];
      }
      return session;
    }
  },
  events: {
    // Fires right after the Prisma adapter creates a user row (OAuth sign-ups).
    // Unlike the signIn callback — which runs before the row exists for a
    // brand-new Google user, so the reward lookup finds nobody — this fires
    // with the persisted user, making the one-time "verify email" credit
    // reliable. Idempotent: the service refuses to credit twice.
    async createUser({ user }) {
      try {
        if (!user?.id) return
        const { rewardVerifyEmail } = await import('@/src/be/modules/tcoin/tcoin.service')
        await rewardVerifyEmail(user.id)
      } catch {
        /* best-effort — never block account creation on a reward failure */
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
