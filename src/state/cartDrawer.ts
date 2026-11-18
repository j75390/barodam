import { createContext, useContext } from 'react';

/** Opens the cart drawer from anywhere in the shop layout. */
export const CartContext = createContext<() => void>(() => {});
export const useOpenCart = () => useContext(CartContext);
