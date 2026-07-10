import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

function getAllowedEmails() {
  return (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isVercelDeployment() {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

export function isAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isAuthRequired() {
  return isAuthConfigured() || isVercelDeployment();
}

export const authConfig = {
  providers: isAuthConfigured()
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET
        })
      ]
    : [],
  callbacks: {
    async signIn({ user }) {
      const allowed = getAllowedEmails();
      if (!allowed.length) return false;
      return allowed.includes((user.email || "").toLowerCase());
    },
    async session({ session }) {
      return session;
    }
  }
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
