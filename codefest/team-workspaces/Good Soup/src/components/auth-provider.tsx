"use client";

import { createContext, useContext, type ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

const AuthAvailabilityContext = createContext(false);

export function useAuthAvailability(): boolean {
  return useContext(AuthAvailabilityContext);
}

export function AuthProvider({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  if (!enabled) {
    return (
      <AuthAvailabilityContext.Provider value={false}>
        {children}
      </AuthAvailabilityContext.Provider>
    );
  }

  return (
    <AuthAvailabilityContext.Provider value={true}>
      <SessionProvider>{children}</SessionProvider>
    </AuthAvailabilityContext.Provider>
  );
}
