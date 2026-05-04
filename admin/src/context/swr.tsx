"use client";

import { ReactNode, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { SWRConfig, useSWRConfig } from "swr";
import useSWR from "swr";

import { requestPublicGraphQL } from "@/lib/graphql";

type SessionShape = {
  accessToken?: string;
};

type SessionProp = {
  accessToken?: string;
} | null;

type Variables = Record<string, unknown>;

type CacheEntry<TData> = {
  data: TData;
};

export const SWRProvider = ({
  children,
  session
}: {
  children: ReactNode;
  session: SessionProp;
}) => {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        fetcher: ({ query = "", variables }: { query?: string; variables?: Variables }) =>
          requestPublicGraphQL(query, variables, session?.accessToken),
      }}
    >
      {children}
    </SWRConfig>
  );
};

export const useLazyQuery = <TData,>({ query }: { query: string }) => {
  const session = useSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TData | null>(null);
  const { cache, mutate } = useSWRConfig();

  const trigger = async ({ variables }: { variables?: Variables }) => {
    setLoading(true);
    try {
      const cacheKey = JSON.stringify({ query, variables });
      const cachedValue = cache.get(cacheKey) as CacheEntry<TData> | undefined;

      if (cachedValue?.data) {
        setData(cachedValue.data);
        return cachedValue.data;
      }

      const response = await requestPublicGraphQL<TData>(
        query,
        variables,
        (session.data as SessionShape | null)?.accessToken,
      );

      await mutate(cacheKey, response, { revalidate: false });
      setData(response);
      return response;
    } finally {
      setLoading(false);
    }
  };

  return { trigger, loading, data };
};

export const useQuery = <TData,>({
  query,
  variables = {}
}: {
  query: string;
  variables?: Variables;
}) => {
  const session = useSession();
  const accessToken = (session.data as SessionShape | null)?.accessToken;
  const key = useMemo(
    () => (query ? JSON.stringify({ query, variables, accessToken }) : null),
    [query, variables, accessToken],
  );

  const { data, error, isLoading } = useSWR<TData>(
    key,
    () => requestPublicGraphQL<TData>(query, variables, accessToken),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  return {
    loading: isLoading,
    data: data ?? null,
    error,
  };
};

export const useMutation = <TData,>({ query }: { query: string }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TData | null>(null);

  const trigger = async ({ variables }: { variables?: Variables }) => {
    setLoading(true);
    try {
      const response = await requestPublicGraphQL<TData>(query, variables);
      setData(response);
      return response;
    } finally {
      setLoading(false);
    }
  };

  return { trigger, loading, data };
};

export const useSWRMutation = <TData,>({ query }: { query: string }) => {
  const session = useSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TData | null>(null);

  const trigger = async ({ variables }: { variables?: Variables }) => {
    setLoading(true);
    try {
      const response = await requestPublicGraphQL<TData>(
        query,
        variables,
        (session.data as SessionShape | null)?.accessToken,
      );
      setData(response);
      return response;
    } finally {
      setLoading(false);
    }
  };

  return { trigger, loading, data };
};

export const useSWROffline = <TData,>({
  key,
  defaultValue
}: {
  key: string;
  defaultValue: TData;
}) => {
  const { cache, mutate: update } = useSWRConfig();

  const trigger = () => {
    let value = cache.get(key) as CacheEntry<TData> | undefined;
    if (!value) {
      void update(key, defaultValue, {
        revalidate: false
      });
      value = cache.get(key) as CacheEntry<TData> | undefined;
    }
    return value?.data;
  };

  const mutate = (value: TData) => {
    void update(key, value, {
      revalidate: false
    });
  };

  return { data: trigger(), mutate };
};

export const useSWRNoFocus = (key: string) =>
  useSWR(key, {
    revalidateOnFocus: false,
  });
