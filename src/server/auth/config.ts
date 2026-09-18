import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { authMongoClient, dbConnect } from "@/server/db/client";
import { UserModel } from "@/server/modules/auth/user.model";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validators";
import { rateLimit } from "@/server/ratelimit";

/**
 * Auth.js v5 — database sessions in httpOnly cookies (§13, ADR-04).
 * Credentials MVP; Google OAuth lands in V1.1 behind the same session layer.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: MongoDBAdapter(authMongoClient(), { databaseName: "thanawico" }),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw, req) => {
        const ip =
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        const parsed = loginSchema.safeParse(raw);
        const id = parsed.success ? parsed.data.email : "invalid";
        const rl = await rateLimit(`login:${ip}:${id}`, 5, 60_000);
        if (!rl.ok) throw new Error("RATE_LIMITED");

        if (!parsed.success) return null;
        await dbConnect();
        const user = await UserModel.findOne({
          email: parsed.data.email,
          status: { $in: ["active", "deletion_pending"] },
        })
          .select("+passwordHash")
          .lean();
        if (!user) return null;
        const ok = await verifyPassword(
          parsed.data.password,
          user.passwordHash,
        );
        if (!ok) return null;
        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
        } as unknown as Record<string, unknown> & { id: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { id: string; role?: string };
        token.id = u.id;
        token.role = u.role ?? "student";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
}));
