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

  // OTIMIZAÇÃO E CORREÇÃO: Usando useMemo para criar a função debounced.
  // Esta é a prática recomendada para memoizar o resultado de uma função como debounce.
  const debouncedSave = useMemo(
    () =>
      debounce((term: string) => {
        localStorage.setItem("clientSearchTerm", term);
      }, 500), // Salva 500ms após o usuário parar de digitar
    [] // O array de dependências vazio garante que a função seja criada apenas uma vez
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
