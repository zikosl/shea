import { User } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    accessToken: string,
    refreshToken: string,
    expires: string
    accessTokenExpires: string
    user: {
      id: string
      email: string
      admin: {
        firstname: string
        lastname: string
      }
    }
  }
  interface User {
    accessToken: string,
    refreshToken: string,
    accessTokenExpires: string
    user: {
      id: string
      email: string
      admin: {
        firstname: string
        lastname: string
      }
    }
  }

}


declare module "next-auth/jwt" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */

  interface JWT {
    accessToken: string,
    refreshToken: string,
    expires: string
    accessTokenExpires: string
    /** OpenID ID Token */
    user?: {
      id: string
      email: string
      admin: {
        firstname: string
        lastname: string
      }
    }
  }
}
