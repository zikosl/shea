import CredentialsProvider from "next-auth/providers/credentials";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Africa/Algiers")

import { LOGIN, LOGOUT, REFRECH, UPDATE_PROFILE } from "@/api/mutations";
import { client } from "@/lib/client";
import { GraphQLResponse } from "graphql-request";
import { AuthOptions } from "next-auth";

/*
const user = 
*/
export const options: AuthOptions = {
    pages: {
        signIn: "/login",
        error: "/",
        signOut: "/"
    },
    session: {
        strategy: "jwt",
    },
    providers: [
        CredentialsProvider({
            name: "credentials",
            async authorize(credentials, req) {

                try {
                    const user: GraphQLResponse = await client.request(
                        LOGIN,
                        {
                            email: credentials?.email,
                            password: credentials?.password,
                        }
                    );
                    return user.signIn as any;
                } catch (e) {
                }
                return null;
            },
            credentials: {
                email: {},
                password: {}
            },
        })
    ],
    callbacks: {
        async session({ session, token, user }) {
            session = {
                accessToken: token.accessToken,
                expires: token.accessToken,
                refreshToken: token.accessToken,
                accessTokenExpires: token.accessToken,
                user: token.user
            };
            return session;
        },

        async jwt({ token, user, trigger, session }) {

            if (user) {
                token = {
                    ...user,
                    expires: ""
                };
                return token;
            }
            if (trigger === 'update') {
                const response: any = await client.request(
                    UPDATE_PROFILE,
                    session,
                    {
                        authorization: `Bearer ${token.accessToken}`,
                    }
                );
                token = {
                    ...response.updateProfile,
                    expires: ""
                }
                return token
            }

            if (token?.accessTokenExpires) {
                if (dayjs(token?.accessTokenExpires).diff(dayjs()) > 0) {
                    return token;
                } else {
                    try {
                        const response: any = await client.request(
                            REFRECH,
                            {},
                            {
                                authorization: `Bearer ${token.refreshToken}`,
                            }
                        );
                        token =
                        {
                            ...response.refrechToken,
                            expires: ""
                        };
                        return token;
                    } catch (error) {
                        // An error occurred, redirect user to login page
                        // throw new Error("Failed to refresh token");
                    }
                }
            } else {
                // Refresh token is invalid, redirect user to login page
                throw new Error("No access token found");
            }
        },
    },
    events: {
        signOut: async (message) => {

            // client.request(
            //     LOGOUT,
            //     {},
            //     {
            //         "Token-Id": message.token.user.tokenId ?? "",
            //         authorization: `Bearer ${token.user.refreshToken}`
            //     }
            // ).then(() => { })
            //     .catch(() => { })
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

