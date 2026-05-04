import { DefaultSession } from "next-auth";

type AdminProfile = {
  firstname: string;
  lastname: string;
  birthday?: string;
  city?: number;
};

type SessionUser = {
  id: string;
  email: string;
  admin?: AdminProfile | null;
};

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    tokenId?: string;
    expires: string;
    accessTokenExpires?: string;
    user: SessionUser;
    error?: "RefreshAccessTokenError";
  }

  interface User {
    id: string;
    accessToken: string;
    refreshToken: string;
    tokenId: string;
    accessTokenExpires: string;
    user: SessionUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    tokenId: string;
    expires?: string;
    accessTokenExpires: string;
    user: SessionUser;
    error?: "RefreshAccessTokenError";
  }
}
