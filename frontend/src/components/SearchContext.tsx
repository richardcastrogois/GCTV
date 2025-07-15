"use client";

// MUDANÇA: 'useCallback' foi trocado por 'useMemo' para a criação da função debounced.
import { ReactNode, useState, useEffect, useMemo } from "react";
import debounce from "lodash/debounce";
import { SearchContext } from "../contexts/SearchContext";

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const storedSearchTerm = localStorage.getItem("clientSearchTerm") || "";
    setSearchTerm(storedSearchTerm);
  }, []);

  const debouncedSave = useMemo(
    () =>
      debounce((term: string) => {
        localStorage.setItem("clientSearchTerm", term);
      }, 500),
    []
  );

  useEffect(() => {
    if (searchTerm !== undefined) {
      debouncedSave(searchTerm);
    }
  }, [searchTerm, debouncedSave]);

  return (
    <SearchContext.Provider value={{ searchTerm, setSearchTerm }}>
      {children}
    </SearchContext.Provider>
  );
}
