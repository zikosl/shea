import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { options } from "@/app/api/auth/[...nextauth]/options";
import type { JWT } from "next-auth/jwt";

export async function getAuthSession() {
  return getServerSession(options);
}

async function getJwtToken() {
  const requestHeaders = await headers();

  return getToken({
    req: {
      headers: Object.fromEntries(requestHeaders.entries()),
    } as any,
    secret: process.env.NEXTAUTH_SECRET,
  }) as Promise<JWT | null>;
}

export async function getAccessToken() {
  const session = await getAuthSession();
  if (session?.accessToken) {
    return session.accessToken;
  }

  const token = await getJwtToken();
  return token?.accessToken;
}

export async function requireAccessToken() {
  const session = await getAuthSession();
  const token = await getJwtToken();
  const accessToken = session?.accessToken ?? token?.accessToken;
  const hasRefreshError =
    session?.error === "RefreshAccessTokenError" ||
    token?.error === "RefreshAccessTokenError";
  const tokenSource = session?.accessToken
    ? "session"
    : token?.accessToken
      ? "jwt"
      : "missing";

  console.log("[Admin Auth]", {
    tokenSource,
    hasSession: Boolean(session),
    hasSessionAccessToken: Boolean(session?.accessToken),
    hasJwtAccessToken: Boolean(token?.accessToken),
    sessionError: session?.error ?? null,
    jwtError: token?.error ?? null,
  });

  if (!accessToken || hasRefreshError) {
    redirect("/login");
  }

  return accessToken;
}
