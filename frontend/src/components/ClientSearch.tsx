"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import debounce from "lodash/debounce";
import { FaSearch } from "react-icons/fa";
import { useSearch } from "@/hooks/useSearch";

export default function ClientSearch() {
  const { searchTerm: globalSearchTerm, setSearchTerm: setGlobalSearchTerm } =
    useSearch();

  // OTIMIZAÇÃO: Usa um estado local para o input, garantindo resposta visual imediata.
  const [localSearchTerm, setLocalSearchTerm] = useState(globalSearchTerm);

  // OTIMIZAÇÃO: A função debounced agora só atualiza o estado global.
  const debouncedSetGlobalSearchTerm = useMemo(
    () =>
      debounce((term: string) => {
        setGlobalSearchTerm(term);
      }, 300), // Atraso de 300ms para iniciar a busca na API
    [setGlobalSearchTerm]
  );

  // Atualiza o valor local quando o global mudar (ex: se for limpo em outro lugar)
  useEffect(() => {
    setLocalSearchTerm(globalSearchTerm);
  }, [globalSearchTerm]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const term = e.target.value;
      // Atualiza o estado local imediatamente para o input ser responsivo
      setLocalSearchTerm(term);
      // Dispara a atualização global debounced
      debouncedSetGlobalSearchTerm(term);
    },
    [debouncedSetGlobalSearchTerm]
  );

  // Limpa o debounce quando o componente é desmontado
  useEffect(() => {
    return () => {
      debouncedSetGlobalSearchTerm.cancel();
    };
  }, [debouncedSetGlobalSearchTerm]);

  return (
    <div className="client-search-container">
      <FaSearch className="search-icon" />
      <input
        type="text"
        placeholder="Pesquisar por nome, email, plano, valor, etc..."
        // O valor do input agora é controlado pelo estado local
        value={localSearchTerm}
        onChange={handleChange}
        className="client-search-input"
      />
    </div>
  );
}
