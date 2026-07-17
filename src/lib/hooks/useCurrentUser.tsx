"use client";

import React from "react";

// Identidade do usuário logado no cliente. O shell (planner) resolve isto no
// servidor (getAuthContext) e injeta aqui — não há hook de auth client-side, e
// componentes como o painel de comentários e o versionamento precisam do nome
// real de quem está agindo.
export interface CurrentUser {
  name: string;
  email: string;
  orgName: string;
}

const CurrentUserContext = React.createContext<CurrentUser | null>(null);

export function CurrentUserProvider({
  value,
  children,
}: {
  value: CurrentUser;
  children: React.ReactNode;
}) {
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

/** Usuário logado; cai para rótulos genéricos fora do shell autenticado. */
export function useCurrentUser(): CurrentUser {
  return (
    React.useContext(CurrentUserContext) ?? { name: "Você", email: "", orgName: "" }
  );
}
