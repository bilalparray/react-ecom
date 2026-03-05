import { create } from "zustand";

export type Customer = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  contact: string;
  // Based on your Backend Interface: CustomerAddressDetailSM[]
  addresses: CustomerAddress[];
};

export type CustomerAddress = {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressType: AddressType;
};

// 1. Define the values as a const object (this exists at runtime)
export const AddressType = {
  Home: "Home",
  Work: "Work",
  Other: "Other",
} as const;

// 2. Create a type based on those values (this is erased at compile time)
export type AddressType = (typeof AddressType)[keyof typeof AddressType];

export const useCheckoutStore = create<{
  customers: Customer[];
  selected: Customer | null;
  select: (c: Customer) => void;
  save: (c: Customer) => void;
}>((set) => ({
  customers: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("customers") || "[]") : [],
  selected: null,

  select: (c) => set({ selected: c }),

  save: (c) =>
    set((state) => {
      const list = [...state.customers.filter((x) => x.id !== c.id), c];
      if (typeof window !== "undefined") {
        localStorage.setItem("customers", JSON.stringify(list));
      }
      return { customers: list, selected: c };
    }),
}));
