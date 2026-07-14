import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { isAccessUserActive, normalizeEmail } from "./store";

export function getAdminEmails() {
  return (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isAdminEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  return Boolean(normalizedEmail) && getAdminEmails().includes(normalizedEmail);
}

export async function hasDashboardAccess(email) {
  if (isAdminEmail(email)) return true;
  try {
    return await isAccessUserActive(email);
  } catch {
    return false;
  }
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
      return hasDashboardAccess(user.email);
    },
    async session({ session }) {
      return session;
    }
  }
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
