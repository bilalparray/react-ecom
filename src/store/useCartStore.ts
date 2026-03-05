import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "../models/CartItems";

type CartState = {
  cartItems: CartItem[];
  wishlistItems: CartItem[];

  cartCount: number;
  wishlistCount: number;

  addToCart: (item: Omit<CartItem, "qty">) => void;
  removeFromCart: (productId: number, variantId: number) => void;
  increaseQty: (productId: number, variantId: number) => void;
  decreaseQty: (productId: number, variantId: number) => void;

  addToWishlist: (item: Omit<CartItem, "qty">) => void;
  removeFromWishlist: (productId: number, variantId: number) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartItems: [],
      wishlistItems: [],
      cartCount: 0,
      wishlistCount: 0,

      addToCart: (item) => {
        const items = get().cartItems;
        const existing = items.find(
          (x) =>
            x.productId === item.productId && x.variantId === item.variantId
        );

        if (existing) {
          existing.qty++;
          set({
            cartItems: [...items],
            cartCount: get().cartCount + 1,
          });
          return;
        }

        set({
          cartItems: [...items, { ...item, qty: 1 }],
          cartCount: get().cartCount + 1,
        });
      },

      increaseQty: (productId, variantId) => {
        const items = get().cartItems;
        const item = items.find(
          (x) => x.productId === productId && x.variantId === variantId
        );
        if (!item) return;

        item.qty++;
        set({ cartItems: [...items], cartCount: get().cartCount + 1 });
      },

      decreaseQty: (productId, variantId) => {
        const items = get().cartItems;
        const item = items.find(
          (x) => x.productId === productId && x.variantId === variantId
        );
        if (!item || item.qty <= 1) return;

        item.qty--;
        set({ cartItems: [...items], cartCount: get().cartCount - 1 });
      },

      removeFromCart: (productId, variantId) => {
        const items = get().cartItems;
        const item = items.find(
          (x) => x.productId === productId && x.variantId === variantId
        );
        if (!item) return;

        set({
          cartItems: items.filter(
            (x) => !(x.productId === productId && x.variantId === variantId)
          ),
          cartCount: get().cartCount - item.qty,
        });
      },

      addToWishlist: (item) => {
        const items = get().wishlistItems;
        const exists = items.some(
          (x) =>
            x.productId === item.productId && x.variantId === item.variantId
        );
        if (exists) return;

        set({
          wishlistItems: [...items, { ...item, qty: 1 }],
          wishlistCount: get().wishlistCount + 1,
        });
      },

      removeFromWishlist: (productId, variantId) => {
        const updated = get().wishlistItems.filter(
          (x) => !(x.productId === productId && x.variantId === variantId)
        );
        set({
          wishlistItems: updated,
          wishlistCount: updated.length,
        });
      },
    }),
    { name: "alpine-cart" }
  )
);
