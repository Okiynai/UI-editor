import React, { createContext, useContext } from 'react';

const CartContext = createContext<any>({
  cart: { items: [] },
  addItem: () => {},
  removeItem: () => {},
  clearCart: () => {}
});

const CartProvider = ({ children }: { children: React.ReactNode }) => {
  return <CartContext.Provider value={CartContext._currentValue}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
export default CartProvider;
