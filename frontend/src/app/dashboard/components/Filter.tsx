// frontend/src/app/dashboard/components/Filter.tsx

// Otimização: Adicionado React.memo e useCallback para as funções
import { useState, useEffect, useMemo, memo, useCallback } from "react";
import Select, { StylesConfig } from "react-select";

// Interface para as opções do react-select
interface SelectOption {
  value: number;
  label: string;
}

// Estilos customizados para o react-select (mantido fora para não ser recriado)
const customStyles: StylesConfig<SelectOption, false> = {
  control: (provided) => ({
    // ... (seu código de estilos permanece o mesmo aqui)
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
    // ... (seu código de estilos permanece o mesmo aqui)
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
    // ... (seu código de estilos permanece o mesmo aqui)
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
    // ... (seu código de estilos permanece o mesmo aqui)
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

// Otimização: Usando React.memo para evitar re-renderizações desnecessárias
const Filter = memo(({ onFilterChange }: FilterProps) => {
  // useMemo aqui está correto, pois os valores são constantes
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
    [],
  );

  // ✅ ANOS DINÂMICOS (sem hardcode)
  const [years, setYears] = useState<SelectOption[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<SelectOption | null>(null);
  const [selectedYear, setSelectedYear] = useState<SelectOption | null>(null);

  // Este useEffect é bom para inicialização no lado do cliente e evitar erros de hidratação (SSR)
  useEffect(() => {
    const currentDate = new Date();

    // ✅ Gera anos a partir de um ano base até o ano atual
    const startYear = 2023; // mantenha o primeiro ano que você quer suportar
    const currentYearNumber = currentDate.getFullYear();

    const generatedYears: SelectOption[] = [];
    for (let y = startYear; y <= currentYearNumber; y++) {
      generatedYears.push({ value: y, label: String(y) });
    }

    setYears(generatedYears);

    const currentMonth = months.find(
      (m) => m.value === currentDate.getMonth() + 1,
    );
    const currentYear = generatedYears.find(
      (y) => y.value === currentYearNumber,
    );

    setSelectedMonth(currentMonth || null);
    setSelectedYear(currentYear || null);
  }, [months]);

  const handleMonthChange = useCallback(
    (option: SelectOption | null) => {
      setSelectedMonth(option);
      if (option && selectedYear) {
        onFilterChange(option.value, selectedYear.value);
      }
    },
    [selectedYear, onFilterChange],
  );

  const handleYearChange = useCallback(
    (option: SelectOption | null) => {
      setSelectedYear(option);
      if (option && selectedMonth) {
        onFilterChange(selectedMonth.value, option.value);
      }
    },
    [selectedMonth, onFilterChange],
  );

  return (
    <div className="flex flex-wrap sm:flex-row gap-4 sm:gap-1 items-center">
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
          placeholder="Selecione..."
        />
      </div>
      <div className="flex items-center mt-2 sm:mt-0 sm:ml-4">
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
          className="w-32"
          classNamePrefix="custom-select"
          styles={customStyles}
          placeholder="Selecione..."
        />
      </div>
    </div>
  );
});

Filter.displayName = "Filter"; // Bom para depuração
export default Filter;
