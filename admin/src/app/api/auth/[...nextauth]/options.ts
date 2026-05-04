import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import { LOGIN, LOGOUT, REFRESH_TOKEN, UPDATE_PROFILE } from "@/api/mutations";
import { requestInternalGraphQL } from "@/lib/graphql";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Africa/Algiers");

type AdminProfile = {
  firstname: string;
  lastname: string;
  birthday?: string;
  city?: number;
};

type AuthUser = {
  id?: string;
  accessToken: string;
  refreshToken: string;
  tokenId: string;
  accessTokenExpires: string;
  user: {
    id: string;
    email: string;
    admin?: AdminProfile | null;
  };
};

type AuthMutationResponse = {
  signIn: AuthUser;
};

type RefreshTokenResponse = {
  refreshToken: AuthUser;
};

type UpdateProfileResponse = {
  updateProfile: AuthUser;
};

const mapTokenFromUser = (user: AuthUser) => ({
  accessToken: user.accessToken,
  refreshToken: user.refreshToken,
  tokenId: user.tokenId,
  accessTokenExpires: user.accessTokenExpires,
  user: user.user,
});

export const options: AuthOptions = {
  pages: {
    signIn: "/login",
    error: "/login",
    signOut: "/"
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await requestInternalGraphQL<AuthMutationResponse>(LOGIN, {
            email: credentials.email,
            password: credentials.password,
          });

          return {
            id: response.signIn.user.id,
            ...response.signIn,
          };
        } catch (error) {
          console.error("NextAuth authorize failed", error);
          return null;
        }
      },
    })
  ],
  callbacks: {
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.tokenId = token.tokenId;
      session.accessTokenExpires = token.accessTokenExpires;
      session.expires = token.accessTokenExpires;
      session.user = token.user;
      session.error = token.error;
      return session;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        return {
          ...token,
          ...mapTokenFromUser(user as AuthUser),
        };
      }

      if (trigger === "update" && token.accessToken) {
        const response = await requestInternalGraphQL<UpdateProfileResponse>(
          UPDATE_PROFILE,
          session,
          token.accessToken,
        );

        return {
          ...token,
          ...mapTokenFromUser(response.updateProfile),
        };
      }

      if (!token.accessTokenExpires || !token.refreshToken) {
        return token;
      }

      if (dayjs(token.accessTokenExpires).diff(dayjs()) > 0) {
        return token;
      }

      try {
        const response = await requestInternalGraphQL<RefreshTokenResponse>(
          REFRESH_TOKEN,
          { data: token.refreshToken },
        );

        return {
          ...token,
          ...mapTokenFromUser(response.refreshToken),
        };
      } catch (error) {
        console.error("NextAuth token refresh failed", error);
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
    },
  },
  events: {
    async signOut(message) {
      const accessToken = message.token?.accessToken;
      if (!accessToken) {
        return;
      }

      try {
        await requestInternalGraphQL(LOGOUT, undefined, accessToken);
      } catch (error) {
        console.error("NextAuth logout sync failed", error);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
