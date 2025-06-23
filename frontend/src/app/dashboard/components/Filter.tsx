//frontend/src/app/dashboard/components/Filter.tsx

import { useState, useEffect, useMemo } from "react";
import Select, { StylesConfig } from "react-select";

// Interface para as opções do react-select
interface SelectOption {
  value: number;
  label: string;
}

// Estilos customizados para o react-select
const customStyles: StylesConfig<SelectOption, false> = {
  control: (provided) => ({
    ...provided,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(5px)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "0.5rem",
    padding: "0.25rem 0.5rem",
    boxShadow: "none",
    color: "var(--text-primary)",
    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
    "&:hover": {
      borderColor: "rgba(255, 255, 255, 0.5)",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    backdropFilter: "blur(5px)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "0.5rem",
    marginTop: "0.25rem",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
    zIndex: 9999,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 0,
    maxHeight: "200px",
    scrollbarWidth: "thin",
    scrollbarColor: "var(--accent-gray) transparent",
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "var(--accent-gray)",
      borderRadius: "3px",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: "rgba(174, 125, 172, 0.8)",
    },
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "var(--accent-blue)"
      : state.isFocused
      ? "rgba(241, 145, 109, 0.4)"
      : "transparent",
    color: state.isSelected
      ? "var(--button-active-text)"
      : "var(--text-primary-secondary)",
    padding: "0.5rem 1rem",
    transition: "background-color 0.2s ease",
    "&:hover": {
      backgroundColor: state.isSelected
        ? "var(--accent-blue)"
        : "rgba(241, 145, 109, 0.4)",
    },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "var(--text-primary)",
  }),
  indicatorSeparator: (provided) => ({
    ...provided,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: "var(--text-primary-secondary)",
    padding: "0.25rem",
    "&:hover": {
      color: "var(--accent-blue)",
    },
  }),
};

interface FilterProps {
  onFilterChange: (month: number, year: number) => void;
}

export default function Filter({ onFilterChange }: FilterProps) {
  const months = useMemo(
    () => [
      { value: 1, label: "Janeiro" },
      { value: 2, label: "Fevereiro" },
      { value: 3, label: "Março" },
      { value: 4, label: "Abril" },
      { value: 5, label: "Maio" },
      { value: 6, label: "Junho" },
      { value: 7, label: "Julho" },
      { value: 8, label: "Agosto" },
      { value: 9, label: "Setembro" },
      { value: 10, label: "Outubro" },
      { value: 11, label: "Novembro" },
      { value: 12, label: "Dezembro" },
    ],
    []
  );

  const years = useMemo(
    () => [
      { value: 2023, label: "2023" },
      { value: 2024, label: "2024" },
      { value: 2025, label: "2025" },
    ],
    []
  );

  const [selectedMonth, setSelectedMonth] = useState<SelectOption | null>(null);
  const [selectedYear, setSelectedYear] = useState<SelectOption | null>(null);

  useEffect(() => {
    // Inicializa os valores com base na data atual apenas no cliente
    const currentMonth = months.find(
      (m) => m.value === new Date().getMonth() + 1
    );
    const currentYear = years.find((y) => y.value === new Date().getFullYear());
    setSelectedMonth(currentMonth || null);
    setSelectedYear(currentYear || null);
  }, [months, years]);

  const handleMonthChange = (option: SelectOption | null) => {
    setSelectedMonth(option);
    onFilterChange(
      option?.value || new Date().getMonth() + 1,
      selectedYear?.value || new Date().getFullYear()
    );
  };

  const handleYearChange = (option: SelectOption | null) => {
    setSelectedYear(option);
    onFilterChange(
      selectedMonth?.value || new Date().getMonth() + 1,
      option?.value || new Date().getFullYear()
    );
  };

  return (
    <div className="flex flex-col sm:flex-row items-center">
      <div className="flex items-center">
        <label
          className="mr-2 text-lg"
          style={{ color: "var(--text-secondary)" }}
        >
          Mês:
        </label>
        <Select
          options={months}
          value={selectedMonth}
          onChange={handleMonthChange}
          className="w-40"
          classNamePrefix="custom-select"
          styles={customStyles}
        />
      </div>
      <div className="flex items-center">
        <label
          className="mr-2 text-lg"
          style={{ color: "var(--text-secondary)" }}
        >
          Ano:
        </label>
        <Select
          options={years}
          value={selectedYear}
          onChange={handleYearChange}
          className="w-28"
          classNamePrefix="custom-select"
          styles={customStyles}
        />
      </div>
    </div>
  );
}