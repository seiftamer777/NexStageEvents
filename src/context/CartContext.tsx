import React, { createContext, useContext, useState, useCallback } from 'react';
import type { CartItem } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type CartContextType = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (item: CartItem) => void;
  removeItem: (serviceId: string) => void;
  updateQuantity: (serviceId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (serviceId: string) => boolean;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType>({} as CartContextType);

export const useCart = () => useContext(CartContext);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = items.reduce((sum, item) => sum + item.subtotal, 0);

  const addItem = useCallback((newItem: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.serviceId === newItem.serviceId);
      if (existing) {
        // Update quantity + subtotal if already in cart
        return prev.map((i) =>
          i.serviceId === newItem.serviceId
            ? {
                ...i,
                quantity: i.quantity + newItem.quantity,
                subtotal: (i.quantity + newItem.quantity) * i.unitPrice,
              }
            : i
        );
      }
      return [...prev, newItem];
    });
  }, []);

  const removeItem = useCallback((serviceId: string) => {
    setItems((prev) => prev.filter((i) => i.serviceId !== serviceId));
  }, []);

  const updateQuantity = useCallback((serviceId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(serviceId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.serviceId === serviceId
          ? { ...i, quantity, subtotal: quantity * i.unitPrice }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const isInCart = useCallback(
    (serviceId: string) => items.some((i) => i.serviceId === serviceId),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalPrice,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isInCart,
      }}>
      {children}
    </CartContext.Provider>
  );
}