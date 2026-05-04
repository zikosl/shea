"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import {
  ApiError,
  createPartnerPosOrder,
  deleteProduct,
  fetchBrands,
  fetchCategories,
  fetchOrders,
  fetchPartnerPosOrders,
  fetchPartnerNiches,
  fetchProducts,
  fetchProductTemplates,
  fetchProductTypes,
  logoutPartner,
  publishVariants,
  refreshPartnerSession,
  requestGraphQL,
  signInPartner,
  toPartnerProfile,
  updateOrderStatus,
  updatePartnerProfile,
  updateProduct,
  uploadFile,
} from "@/lib/graphql";
import type {
  AuthPayload,
  Brand,
  Category,
  Niche,
  OfflineMutation,
  Order,
  PartnerProfile,
  Product,
  ProductFilterState,
  ProductTemplate,
  ProductType,
  ProfileInput,
  PosCartLine,
  PosPaymentMethod,
  PosTicket,
  VariantPriceDraft,
} from "@/types/app";

type PartnerState = {
  session: AuthPayload | null;
  profile: PartnerProfile | null;
  orders: Order[];
  niches: Niche[];
  categories: Category[];
  brands: Brand[];
  productTypes: ProductType[];
  products: Product[];
  templates: ProductTemplate[];
  posCart: PosCartLine[];
  posTickets: PosTicket[];
  productFilters: ProductFilterState;
  queue: OfflineMutation[];
  lastSyncedAt: string | null;
  isBootstrapping: boolean;
  isSyncing: boolean;
  isPublishing: boolean;
  error: string | null;
  setFilters: (filters: Partial<ProductFilterState>) => void;
  resetFilters: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  bootstrap: () => Promise<void>;
  refreshCatalogDependencies: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  loadCategoriesForNiche: (nicheId: number) => Promise<void>;
  loadProductTypesForCategory: (categoryId: number) => Promise<void>;
  loadProducts: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  addToPosCart: (product: Product) => void;
  updatePosLineQuantity: (productId: number, quantity: number) => void;
  removeFromPosCart: (productId: number) => void;
  clearPosCart: () => void;
  completePosTicket: (input: {
    customerName?: string;
    note?: string;
    discount: number;
    paymentMethod: PosPaymentMethod;
  }) => Promise<void>;
  cancelPosTicket: (ticketId: string) => void;
  updateOrder: (id: number, status: Order["delivery"]["status"]) => Promise<void>;
  publishSelectedVariants: (items: VariantPriceDraft[]) => Promise<void>;
  updateProductCard: (id: number, input: { price?: number; stock?: number; available?: boolean }) => Promise<void>;
  removeProductCard: (id: number) => Promise<void>;
  saveProfile: (input: ProfileInput & { avatarFile?: File | string | null }) => Promise<void>;
  flushQueue: () => Promise<void>;
  clearError: () => void;
};

const initialFilters: ProductFilterState = {
  search: "",
  nicheId: null,
  categoryId: null,
  productTypeId: null,
  brandId: null,
};

function mutationId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function withSession<T>(
  session: AuthPayload | null,
  setSession: (session: AuthPayload | null) => void,
  action: (accessToken: string) => Promise<T>,
) {
  if (!session?.accessToken) {
    throw new ApiError("You need to sign in again.", 401);
  }

  try {
    return await action(session.accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && session.refreshToken) {
      const refreshed = await refreshPartnerSession(session.refreshToken);
      setSession(refreshed);
      return action(refreshed.accessToken);
    }

    throw error;
  }
}

export const usePartnerStore = create<PartnerState>()(
  persist(
    (set, get) => ({
      session: null,
      profile: null,
      orders: [],
      niches: [],
      categories: [],
      brands: [],
      productTypes: [],
      products: [],
      templates: [],
      posCart: [],
      posTickets: [],
      productFilters: initialFilters,
      queue: [],
      lastSyncedAt: null,
      isBootstrapping: false,
      isSyncing: false,
      isPublishing: false,
      error: null,

      setFilters: (filters) =>
        set((state) => ({
          productFilters: {
            ...state.productFilters,
            ...filters,
          },
        })),
      resetFilters: () =>
        set({
          productFilters: initialFilters,
          categories: [],
          productTypes: [],
        }),
      clearError: () => set({ error: null }),

      signIn: async (email, password) => {
        set({ isBootstrapping: true, error: null });

        try {
          const session = await signInPartner(email, password);
          set({
            session,
            profile: toPartnerProfile(session),
          });
          await get().bootstrap();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Unable to sign in." });
        } finally {
          set({ isBootstrapping: false });
        }
      },

      signOut: async () => {
        const session = get().session;

        try {
          if (session?.accessToken) {
            await logoutPartner(session.accessToken);
          }
        } catch {
          // Keep logout resilient.
        } finally {
          set({
            session: null,
            profile: null,
            orders: [],
            niches: [],
            categories: [],
            brands: [],
            productTypes: [],
            products: [],
            templates: [],
            posCart: [],
            posTickets: [],
            queue: [],
            lastSyncedAt: null,
            error: null,
          });
        }
      },

      bootstrap: async () => {
        set({ isBootstrapping: true, error: null });
        const session = get().session;

        try {
          await withSession(
            session,
            (nextSession) => set({ session: nextSession, profile: nextSession ? toPartnerProfile(nextSession) : null }),
            async (token) => {
              const [orders, brands, niches, products, templates, posOrders] = await Promise.all([
                fetchOrders(token),
                fetchBrands(token),
                fetchPartnerNiches(token),
                fetchProducts(token, get().productFilters),
                fetchProductTemplates(token, get().productFilters),
                fetchPartnerPosOrders(token),
              ]);

              const posTickets: PosTicket[] = posOrders.map((order) => {
                const subtotal = order.items.reduce((total, item) => total + item.price * item.quantity, 0);
                const status: PosTicket["status"] = order.delivery?.status === "CANCELED" ? "canceled" : "completed";
                return {
                  id: `server-${order.id}`,
                  serverOrderId: order.id,
                  createdAt: order.date,
                  status,
                  syncStatus: "synced" as const,
                  customerName: order.walkInCustomerName || `${order.client?.firstname || ""} ${order.client?.lastname || ""}`.trim() || "Walk-in customer",
                  note: order.note || undefined,
                  paymentMethod: (order.paymentMethod as PosPaymentMethod) || "cash",
                  discount: order.discount || 0,
                  subtotal,
                  total: Math.max(subtotal - (order.discount || 0), 0),
                  lines: order.items.map((item) => ({
                    productId: Number(item.product?.id || 0),
                    name: item.product?.name || "Unnamed product",
                    sku: item.product?.sku,
                    image: item.product?.images?.[0]?.url,
                    price: item.price,
                    quantity: item.quantity,
                  })),
                };
              });

              set((state) => ({
                orders,
                brands,
                niches,
                products,
                templates,
                posTickets: [
                  ...posTickets,
                  ...state.posTickets.filter((ticket) => ticket.syncStatus === "local"),
                ],
                lastSyncedAt: new Date().toISOString(),
              }));
            },
          );
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to sync workspace." });
        } finally {
          set({ isBootstrapping: false });
        }
      },

      refreshCatalogDependencies: async () => {
        const { nicheId, categoryId } = get().productFilters;

        if (nicheId) {
          await get().loadCategoriesForNiche(nicheId);
        }

        if (categoryId) {
          await get().loadProductTypesForCategory(categoryId);
        }
      },

      refreshWorkspace: async () => {
        set({ isSyncing: true, error: null });

        try {
          await get().refreshCatalogDependencies();
          await get().bootstrap();
          await get().flushQueue();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Refresh failed." });
        } finally {
          set({ isSyncing: false });
        }
      },

      loadCategoriesForNiche: async (nicheId) => {
        const session = get().session;
        try {
          await withSession(
            session,
            (nextSession) => set({ session: nextSession, profile: nextSession ? toPartnerProfile(nextSession) : null }),
            async (token) => {
              const categories = await fetchCategories(token, nicheId);
              set((state) => ({
                categories,
                productFilters: {
                  ...state.productFilters,
                  nicheId,
                  categoryId: null,
                  productTypeId: null,
                },
              }));
            },
          );
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Unable to load categories." });
        }
      },

      loadProductTypesForCategory: async (categoryId) => {
        const session = get().session;
        try {
          await withSession(
            session,
            (nextSession) => set({ session: nextSession, profile: nextSession ? toPartnerProfile(nextSession) : null }),
            async (token) => {
              const productTypes = await fetchProductTypes(token, categoryId);
              set((state) => ({
                productTypes,
                productFilters: {
                  ...state.productFilters,
                  categoryId,
                  productTypeId: null,
                },
              }));
            },
          );
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Unable to load product types." });
        }
      },

      loadProducts: async () => {
        const session = get().session;
        try {
          await withSession(
            session,
            (nextSession) => set({ session: nextSession, profile: nextSession ? toPartnerProfile(nextSession) : null }),
            async (token) => {
              const products = await fetchProducts(token, get().productFilters);
              set({
                products,
                lastSyncedAt: new Date().toISOString(),
              });
            },
          );
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Unable to load products." });
        }
      },

      loadTemplates: async () => {
        const session = get().session;
        try {
          await withSession(
            session,
            (nextSession) => set({ session: nextSession, profile: nextSession ? toPartnerProfile(nextSession) : null }),
            async (token) => {
              const templates = await fetchProductTemplates(token, get().productFilters);
              set({
                templates,
                lastSyncedAt: new Date().toISOString(),
              });
            },
          );
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Unable to load templates." });
        }
      },

      addToPosCart: (product) => {
        set((state) => {
          if (!product.available || (product.stock ?? 0) <= 0) {
            return state;
          }

          const existing = state.posCart.find((line) => line.productId === product.id);

          if (existing) {
            const nextQuantity = existing.quantity + 1;
            if (nextQuantity > (product.stock ?? 0)) {
              return state;
            }

            return {
              posCart: state.posCart.map((line) =>
                line.productId === product.id ? { ...line, quantity: nextQuantity } : line,
              ),
            };
          }

          return {
            posCart: [
              ...state.posCart,
              {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                image: product.images[0]?.url,
                price: product.price,
                quantity: 1,
                stock: product.stock ?? null,
              },
            ],
          };
        });
      },

      updatePosLineQuantity: (productId, quantity) => {
        set((state) => ({
          posCart:
            quantity <= 0
              ? state.posCart.filter((line) => line.productId !== productId)
              : state.posCart.map((line) => {
                  if (line.productId !== productId) {
                    return line;
                  }

                  const product = state.products.find((entry) => entry.id === productId);
                  const maxQuantity = Math.max(1, line.stock ?? product?.stock ?? quantity);
                  return { ...line, quantity: Math.min(quantity, maxQuantity) };
                }),
        }));
      },

      removeFromPosCart: (productId) => {
        set((state) => ({
          posCart: state.posCart.filter((line) => line.productId !== productId),
        }));
      },

      clearPosCart: () => {
        set({ posCart: [] });
      },

      completePosTicket: async (input) => {
        const session = get().session;
        const snapshot = get().posCart;

        if (!snapshot.length) {
          return;
        }

        const subtotal = snapshot.reduce((total, line) => total + line.price * line.quantity, 0);
        const total = Math.max(subtotal - (input.discount || 0), 0);
        const localTicketId = mutationId();

        if (!navigator.onLine) {
          set((state) => ({
            posTickets: [
              {
                id: localTicketId,
                createdAt: new Date().toISOString(),
                status: "completed",
                syncStatus: "local",
                customerName: input.customerName,
                note: input.note,
                paymentMethod: input.paymentMethod,
                discount: input.discount,
                subtotal,
                total,
                lines: state.posCart,
              },
              ...state.posTickets,
            ],
            posCart: [],
            queue: [
              ...state.queue,
              {
                id: mutationId(),
                kind: "posCheckout",
                payload: {
                  localTicketId,
                  customerName: input.customerName,
                  note: input.note,
                  discount: input.discount,
                  paymentMethod: input.paymentMethod,
                  items: state.posCart,
                },
                createdAt: new Date().toISOString(),
              },
            ],
          }));
          return;
        }

        try {
          const order = await withSession(
            session,
            (nextSession) => set({ session: nextSession, profile: nextSession ? toPartnerProfile(nextSession) : null }),
            (token) =>
              createPartnerPosOrder(token, {
                customerName: input.customerName,
                note: input.note,
                discount: input.discount,
                paymentMethod: input.paymentMethod,
                items: snapshot,
              }),
          );

          set((state) => ({
            posTickets: [
              {
                id: `server-${order.id}`,
                serverOrderId: order.id,
                createdAt: order.date,
                status: "completed",
                syncStatus: "synced",
                customerName: order.walkInCustomerName || input.customerName || "Walk-in customer",
                note: order.note || input.note,
                paymentMethod: (order.paymentMethod as PosPaymentMethod) || input.paymentMethod,
                discount: order.discount || input.discount,
                subtotal,
                total: Math.max(subtotal - (order.discount || input.discount || 0), 0),
                lines: snapshot,
              },
              ...state.posTickets.filter((ticket) => ticket.serverOrderId !== order.id),
            ],
            posCart: [],
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Unable to complete POS sale." });
        }
      },

      cancelPosTicket: (ticketId) => {
        set((state) => ({
          posTickets: state.posTickets.map((ticket) =>
            ticket.id === ticketId ? { ...ticket, status: "canceled" } : ticket,
          ),
        }));
      },

      updateOrder: async (id, status) => {
        const session = get().session;

        if (!navigator.onLine) {
          set((state) => ({
            orders: state.orders.map((order) =>
              order.id === id ? { ...order, delivery: order.delivery ? { ...order.delivery, status } : order.delivery } : order,
            ),
            queue: [
              ...state.queue,
              {
                id: mutationId(),
                kind: "orderStatus",
                payload: { id, status },
                createdAt: new Date().toISOString(),
              },
            ],
          }));
          return;
        }

        try {
          const result = await withSession(
            session,
            (nextSession) => set({ session: nextSession, profile: nextSession ? toPartnerProfile(nextSession) : null }),
            (token) => updateOrderStatus(token, id, status),
          );

          set((state) => ({
            orders: state.orders.map((order) =>
              order.id === id ? { ...order, delivery: result.delivery || order.delivery } : order,
            ),
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Unable to update order." });
        }
      },

      publishSelectedVariants: async (items) => {
        const session = get().session;

        if (!items.length) {
          return;
        }

        if (!navigator.onLine) {
          set((state) => ({
            queue: [
              ...state.queue,
              {
                id: mutationId(),
                kind: "publishVariants",
                payload: { items },
                createdAt: new Date().toISOString(),
              },
            ],
          }));
          return;
        }

        set({ isPublishing: true });

        try {
          await withSession(
            session,
            (nextSession) => set({ session: nextSession, profile: nextSession ? toPartnerProfile(nextSession) : null }),
            (token) => publishVariants(token, items),
          );
          await get().loadProducts();
          await get().loadTemplates();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Unable to publish products." });
        } finally {
          set({ isPublishing: false });
        }
      },

      updateProductCard: async (id, input) => {
        const session = get().session;

        if (!navigator.onLine) {
          set((state) => ({
            products: state.products.map((product) => (product.id === id ? { ...product, ...input } : product)),
            queue: [
              ...state.queue,
              {
                id: mutationId(),
                kind: "productUpdate",
                payload: { id, input },
                createdAt: new Date().toISOString(),
              },
            ],
          }));
          return;
        }

        try {
          const product = await withSession(
            session,
            (nextSession) => set({ session: nextSession, profile: nextSession ? toPartnerProfile(nextSession) : null }),
            (token) => updateProduct(token, id, input),
          );

          set((state) => ({
            products: state.products.map((entry) => (entry.id === id ? product : entry)),
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Unable to update product." });
        }
      },

      removeProductCard: async (id) => {
        const session = get().session;

        if (!navigator.onLine) {
          set((state) => ({
            products: state.products.filter((product) => product.id !== id),
            queue: [
              ...state.queue,
              {
                id: mutationId(),
                kind: "productDelete",
                payload: { id },
                createdAt: new Date().toISOString(),
              },
            ],
          }));
          return;
        }

        try {
          await withSession(
            session,
            (nextSession) => set({ session: nextSession, profile: nextSession ? toPartnerProfile(nextSession) : null }),
            (token) => deleteProduct(token, id),
          );

          set((state) => ({
            products: state.products.filter((product) => product.id !== id),
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Unable to delete product." });
        }
      },

      saveProfile: async (input) => {
        const session = get().session;
        const { avatarFile, ...rest } = input;

        if (!navigator.onLine) {
          let avatar = rest.avatar;
          if (typeof avatarFile === "string") {
            avatar = avatarFile;
          }
          set((state) => ({
            profile: state.profile ? { ...state.profile, ...rest, avatar: avatar ?? state.profile.avatar } : state.profile,
            queue: [
              ...state.queue,
              {
                id: mutationId(),
                kind: "profileUpdate",
                payload: {
                  ...rest,
                  avatar,
                },
                createdAt: new Date().toISOString(),
              },
            ],
          }));
          return;
        }

        try {
          const sessionResult = await withSession(
            session,
            (nextSession) => set({ session: nextSession, profile: nextSession ? toPartnerProfile(nextSession) : null }),
            async (token) => {
              const avatarUrl =
                avatarFile && avatarFile !== rest.avatar ? await uploadFile(token, avatarFile) : rest.avatar;
              return updatePartnerProfile(token, {
                ...rest,
                avatar: avatarUrl,
              });
            },
          );

          set({
            session: sessionResult,
            profile: toPartnerProfile(sessionResult),
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Unable to update profile." });
        }
      },

      flushQueue: async () => {
        const session = get().session;
        const queue = [...get().queue];

        if (!navigator.onLine || !queue.length) {
          return;
        }

        set({ isSyncing: true });

        try {
          for (const mutation of queue) {
            await withSession(
              session || get().session,
              (nextSession) => set({ session: nextSession, profile: nextSession ? toPartnerProfile(nextSession) : null }),
              async (token) => {
                switch (mutation.kind) {
                  case "orderStatus":
                    await updateOrderStatus(token, mutation.payload.id, mutation.payload.status);
                    break;
                  case "publishVariants":
                    await publishVariants(token, mutation.payload.items);
                    break;
                  case "productUpdate":
                    await updateProduct(token, mutation.payload.id, mutation.payload.input);
                    break;
                  case "productDelete":
                    await deleteProduct(token, mutation.payload.id);
                    break;
                  case "profileUpdate":
                    await updatePartnerProfile(token, mutation.payload);
                    break;
                  case "posCheckout": {
                    const order = await createPartnerPosOrder(token, {
                      customerName: mutation.payload.customerName,
                      note: mutation.payload.note,
                      discount: mutation.payload.discount,
                      paymentMethod: mutation.payload.paymentMethod,
                      items: mutation.payload.items,
                    });
                    set((state) => ({
                      posTickets: state.posTickets.map((ticket) =>
                        ticket.id === mutation.payload.localTicketId
                          ? {
                              ...ticket,
                              id: `server-${order.id}`,
                              serverOrderId: order.id,
                              createdAt: order.date,
                              syncStatus: "synced",
                            }
                          : ticket,
                      ),
                    }));
                    break;
                  }
                  default:
                    break;
                }
              },
            );

            set((state) => ({
              queue: state.queue.filter((entry) => entry.id !== mutation.id),
            }));
          }

          await Promise.all([get().loadProducts(), get().loadTemplates(), get().bootstrap()]);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Unable to flush queued changes." });
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: "shea-partner-pwa-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
        profile: state.profile,
        orders: state.orders,
        niches: state.niches,
        categories: state.categories,
        brands: state.brands,
        productTypes: state.productTypes,
        products: state.products,
        templates: state.templates,
        posCart: state.posCart,
        posTickets: state.posTickets,
        productFilters: state.productFilters,
        queue: state.queue,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
);
