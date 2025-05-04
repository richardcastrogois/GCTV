"use client";

import { useState, useEffect, useMemo } from "react";
import debounce from "lodash/debounce";
import { FaSearch } from "react-icons/fa";

interface ClientSearchProps {
  onSearchTermChange: (term: string) => void;
}

export default function ClientSearch({
  onSearchTermChange,
}: ClientSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Memoiza a função debounced para que ela seja criada apenas uma vez
  const debouncedSearch = useMemo(
    () =>
      debounce((term: string) => {
        onSearchTermChange(term);
      }, 300),
    [onSearchTermChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

  // Limpa o debounce quando o componente é desmontado
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return (
    <div className="client-search-container">
      <FaSearch className="search-icon" />
      <input
        type="text"
        placeholder="Pesquisar por nome, email, plano, valor, etc..."
        value={searchTerm}
        onChange={handleChange}
        className="client-search-input"
      />
    </div>
  );
}
