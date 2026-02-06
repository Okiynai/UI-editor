import React, { createContext, useContext } from 'react';

const SessionContext = createContext<any>({
  user: { id: 'demo-user', name: 'Demo User' },
  seller: { displayName: 'Demo Seller', personalImage: '/default_avatar.jpg' },
  shop: { id: 'demo-shop', subdomain: 'demo' },
  isLoading: false
});

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  return <SessionContext.Provider value={SessionContext._currentValue}>{children}</SessionContext.Provider>;
};

export const useSession = () => useContext(SessionContext);
