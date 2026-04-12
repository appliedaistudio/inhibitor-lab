import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { getRetentionPool } from "../../../../lib/retention/db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      const client = await getRetentionPool().connect();

      try {
        const existingUser = await client.query<{ id: number }>(
          "SELECT id FROM users WHERE email = $1",
          [user.email]
        );

        if (existingUser.rows.length === 0) {
          await client.query("INSERT INTO users (email, name) VALUES ($1, $2)", [
            user.email,
            user.name ?? "Student",
          ]);
        }

        return true;
      } catch (error) {
        console.error("Error saving user:", error);
        return false;
      } finally {
        client.release();
      }
    },
    async session({ session }) {
      if (!session.user?.email) {
        return session;
      }

      const client = await getRetentionPool().connect();

      try {
        const dbUser = await client.query<{ id: number }>(
          "SELECT id FROM users WHERE email = $1",
          [session.user.email]
        );

        if (dbUser.rows.length > 0) {
          (session.user as { id?: number }).id = dbUser.rows[0].id;
        }
      } finally {
        client.release();
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
