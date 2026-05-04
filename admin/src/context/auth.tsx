"use client";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import React, { useEffect, useRef } from "react";

function SessionExpiryWatcher() {
    const { data } = useSession();
    const hasSignedOut = useRef(false);

    useEffect(() => {
        if (data?.error === "RefreshAccessTokenError" && !hasSignedOut.current) {
            hasSignedOut.current = true;
            void signOut({
                callbackUrl: "/login",
                redirect: true,
            });
        }
    }, [data?.error]);

    return null;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
    return <SessionProvider
        refetchInterval={0}
        refetchOnWindowFocus={false}
        refetchWhenOffline={false}
    >
        <SessionExpiryWatcher />
        {children}
    </SessionProvider>;
}

export default AuthProvider;
