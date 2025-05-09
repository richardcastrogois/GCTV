//frontend/src/components/ClientSearch.tsx

"use client";

import { useEffect, useMemo } from "react";
import debounce from "lodash/debounce";
import { FaSearch } from "react-icons/fa";
import { useSearch } from "@/hooks/useSearch";

export default function ClientSearch() {
  const { searchTerm, setSearchTerm } = useSearch();

  const debouncedSearch = useMemo(
    () =>
      debounce((term: string) => {
        setSearchTerm(term);
      }, 300),
    [setSearchTerm]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

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
