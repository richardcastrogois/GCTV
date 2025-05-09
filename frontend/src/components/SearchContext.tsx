//frontend/src/components/SearchContext.tsx

"use client";

import { ReactNode, useState, useEffect } from "react";
import { SearchContext } from "../contexts/SearchContext";

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");

  // Carrega o valor do localStorage apenas no lado do cliente
  useEffect(() => {
    const storedSearchTerm = localStorage.getItem("clientSearchTerm") || "";
    setSearchTerm(storedSearchTerm);
  }, []);

  // Atualiza o localStorage sempre que searchTerm mudar
  useEffect(() => {
    localStorage.setItem("clientSearchTerm", searchTerm);
  }, [searchTerm]);

  return (
    <SearchContext.Provider value={{ searchTerm, setSearchTerm }}>
      {children}
    </SearchContext.Provider>
  );
}
