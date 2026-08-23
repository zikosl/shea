import { useSyncExternalStore } from 'react';

type StoreApi<T> = {
  getState: () => T;
  subscribe: (listener: () => void) => () => void;
};

export const useStore = <T, F>(
  store: StoreApi<T>,
  callback: (state: T) => F
) => {
  return useSyncExternalStore(
    store.subscribe,
    () => callback(store.getState()),
    () => undefined,
  );
};
