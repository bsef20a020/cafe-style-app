import { createContext, useContext, useMemo, useState } from "react";

const CART_STORAGE_KEY = "noffelo_customer_cart_v1";
const CartContext = createContext(null);

function safeStorage() {
  try {
    window.localStorage.setItem("__noffelo_cart_probe", "1");
    window.localStorage.removeItem("__noffelo_cart_probe");
    return window.localStorage;
  } catch (_error) {
    return null;
  }
}

function readCart() {
  const storage = typeof window !== "undefined" ? safeStorage() : null;
  if (!storage) return [];

  try {
    const parsed = JSON.parse(storage.getItem(CART_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?._id && item.quantity > 0) : [];
  } catch (_error) {
    return [];
  }
}

function writeCart(cart) {
  const storage = typeof window !== "undefined" ? safeStorage() : null;
  if (!storage) return;

  try {
    storage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (_error) {
    // Cart persistence should never block ordering.
  }
}

export function CartProvider({ children }) {
  const [cart, setCartState] = useState(readCart);

  function setCart(updater) {
    setCartState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      writeCart(next);
      return next;
    });
  }

  function addToCart(item) {
    setCart((current) => {
      const existing = current.find((entry) => entry._id === item._id);
      if (existing) {
        return current.map((entry) => (entry._id === item._id ? { ...entry, quantity: entry.quantity + 1 } : entry));
      }

      return [...current, { ...item, quantity: 1 }];
    });
  }

  function changeQuantity(id, delta) {
    setCart((current) =>
      current
        .map((item) => (item._id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(id) {
    setCart((current) => current.filter((item) => item._id !== id));
  }

  function clearCart() {
    setCart([]);
  }

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0),
    [cart]
  );
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const value = useMemo(
    () => ({
      cart,
      cartCount,
      cartTotal,
      addToCart,
      changeQuantity,
      removeItem,
      clearCart
    }),
    [cart, cartCount, cartTotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
