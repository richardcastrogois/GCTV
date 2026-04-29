"use client";

import React from "react";

type ExpiresOrder = "asc" | "desc" | null;

type NewpageFiltersContextValue = {
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  userTypeLabel: string;
  setUserTypeLabel: React.Dispatch<React.SetStateAction<string>>;
  paymentLabel: string;
  setPaymentLabel: React.Dispatch<React.SetStateAction<string>>;
  dateQuery: string;
  setDateQuery: React.Dispatch<React.SetStateAction<string>>;
  expiresOrder: ExpiresOrder;
  toggleExpiresOrder: () => void;
  hasActiveFilters: boolean;
  handleClearFilters: () => void;
};

const NewpageFiltersContext = React.createContext<
  NewpageFiltersContextValue | undefined
>(undefined);

export function NewpageFiltersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchValue, setSearchValue] = React.useState("");
  const [userTypeLabel, setUserTypeLabel] =
    React.useState<string>("Selecione o tipo");
  const [paymentLabel, setPaymentLabel] = React.useState<string>(
    "Selecione o Pagamento",
  );
  const [dateQuery, setDateQuery] = React.useState("");
  const [expiresOrder, setExpiresOrder] = React.useState<ExpiresOrder>(null);

  const toggleExpiresOrder = React.useCallback(() => {
    setExpiresOrder((prev) => {
      if (prev === "asc") return "desc";
      if (prev === "desc") return "asc";
      return "asc";
    });
  }, []);

  const hasActiveFilters =
    searchValue.trim() !== "" ||
    userTypeLabel !== "Selecione o tipo" ||
    paymentLabel !== "Selecione o Pagamento" ||
    dateQuery.trim() !== "" ||
    expiresOrder !== null;

  const handleClearFilters = () => {
    setSearchValue("");
    setUserTypeLabel("Selecione o tipo");
    setPaymentLabel("Selecione o Pagamento");
    setDateQuery("");
    setExpiresOrder(null);
  };

  return (
    <NewpageFiltersContext.Provider
      value={{
        searchValue,
        setSearchValue,
        userTypeLabel,
        setUserTypeLabel,
        paymentLabel,
        setPaymentLabel,
        dateQuery,
        setDateQuery,
        expiresOrder,
        toggleExpiresOrder,
        hasActiveFilters,
        handleClearFilters,
      }}
    >
      {children}
    </NewpageFiltersContext.Provider>
  );
}

export function useNewpageFilters() {
  const context = React.useContext(NewpageFiltersContext);

  if (!context) {
    throw new Error(
      "useNewpageFilters must be used within a NewpageFiltersProvider",
    );
  }

  return context;
}
