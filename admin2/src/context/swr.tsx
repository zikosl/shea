"use client";
import { SWRConfig, useSWRConfig } from "swr";
import request from "graphql-request";

import { endpoint } from "@/constant";
// import { subscribe } from "@/lib/subscribe";
import { client } from "@/lib/server";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { ReactNode, useEffect, useState } from "react";




export const SWRProvider = ({ children, session }: { children: ReactNode, session: any }) => {

    return (
        <SWRConfig
            value={{
                provider: () => new Map(),
                // provider: localStorageProvider,
                fetcher: ({ query = "", variables }, params) => {
                    // if (query.includes("subscription"))
                    //     return subscribe({ query, variables, next: params.next, session })
                    return request(
                        endpoint,
                        query,
                        variables,
                        {
                            authorization: `Bearer ${session?.accessToken}`,
                        }
                    );
                },
            }
            }
        >
            {children}
        </SWRConfig >
    );
};


//with caching mecanisme
export const useLazyQuery = ({ query }: { query: any }) => {
    const session = useSession()
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState(null)
    const { cache, mutate } = useSWRConfig()
    const trigger = ({ variables }) => {
        return new Promise(async (resolve, reject) => {
            setLoading(true)
            try {
                let value = cache.get(JSON.stringify({ query, variables }))
                if (value) {
                    setData(value.data)
                    resolve(value.data)
                }
                else {
                    const response = await client.request(
                        query,
                        variables,
                        {
                            authorization: `Bearer ${session?.data?.accessToken}`
                        }
                    )
                    mutate(JSON.stringify({ query, variables }), response, { revalidate: false })
                    setData(response)
                    resolve(response)
                }
                setLoading(false)
            }
            catch (e) {
                setLoading(false)
                reject(e)
            }
        })
    };
    return { trigger, loading, data }
}


export const useQuery = ({ query, variables = {} }) => {
    const session = useSession()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState(null)
    const [error, setError] = useState()
    useEffect(() => {
        if (query) {
            client.request(
                query,
                variables,
                {
                    authorization: `Bearer ${session?.data?.accessToken}`
                }
            ).then((e) => {
                setData(e)
                setLoading(false)
            }).catch(e => {
                setError(e)
            })
        }
    }, [query, variables, session])
    return { loading, data, error }
}

export const useMutation = ({ query }) => {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState(null)
    // const { cache, mutate } = useSWRConfig()
    const trigger = ({ variables }) => {
        return new Promise(async (resolve, reject) => {
            setLoading(true)
            try {
                // let value = cache.get(JSON.stringify({ query, variables }))
                // if (value) {
                //     setData(value.data)
                //     resolve(value.data)
                // }
                // else {
                const response = await client.request(
                    query,
                    variables
                )
                // mutate(JSON.stringify({ query, variables }), response, { revalidate: false })
                setData(response)
                resolve(response)
                // }
                setLoading(false)
            }
            catch (e) {
                setLoading(false)
                reject(e)
            }
        })
    };
    return { trigger, loading, data }
}

export const useSWRMutation = ({ query }) => {
    const session = useSession()
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState(null)
    // const { cache, mutate } = useSWRConfig()
    const trigger = ({ variables }) => {
        return new Promise(async (resolve, reject) => {
            setLoading(true)
            try {
                // let value = cache.get(JSON.stringify({ query, variables }))
                // if (value) {
                //     setData(value.data)
                //     resolve(value.data)
                // }
                // else {
                const response = await client.request(
                    query,
                    variables,
                    {
                        authorization: `Bearer ${session?.data?.accessToken}`
                    }
                )
                // mutate(JSON.stringify({ query, variables }), response, { revalidate: false })
                setData(response)
                resolve(response)
                // }
                setLoading(false)
            }
            catch (e) {
                setLoading(false)
                reject(e)
            }
        })
    };
    return { trigger, loading, data }
}

export const useSWROffline = ({
    key,
    defaultValue
}) => {
    const { cache, mutate: update, ...extraConfig } = useSWRConfig()

    const trigger = () => {
        let value = cache.get(key)
        if (!value)
            update(key, defaultValue)
        value = cache.get(key)
        return value?.data
    }
    const mutate = (value) => {
        update(key, value, {
            revalidate: false
        })
    }
    return { data: trigger(), mutate }
}



export const useSWRNoFocus = (key) => useSWR(key, {
    // revalidateIfStale: false,
    revalidateOnFocus: false,
});
