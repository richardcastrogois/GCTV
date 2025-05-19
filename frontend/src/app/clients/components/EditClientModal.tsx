//frontend/src/app/clients/components/EditClientModal.tsx

import { FaTimes } from "react-icons/fa";
import { EditFormData, Plan, PaymentMethod } from "../types";
import { createPortal } from "react-dom";
import Select, { StylesConfig } from "react-select";
import { useEffect } from "react"; // Adicionado import do useEffect

// Definir o tipo para as opções do react-select
type SelectOption = { value: string; label: string } | null;

// Estilos customizados para o react-select, replicados do Filter.tsx
const customStyles: StylesConfig<SelectOption, false> = {
  control: (provided) => ({
    ...provided,
    backgroundColor: "rgba(255, 255支部, 255, 0.1)",
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
    backgroundColor: "rgba(255, 255, 255, 0.7)",
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
      ? "rgba(241, 145, 109, 0.6)"
      : "transparent",
    color: state.isSelected
      ? "var(--button-active-text)"
      : "var(--text-primary-secondary)",
    padding: "0.5rem 1rem",
    transition: "background-color 0.2s ease",
    "&:hover": {
      backgroundColor: state.isSelected
        ? "var(--accent-blue)"
        : "rgba(241, 145, 109, 0.6)",
    },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "var(--text-primary)",
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "rgba(255, 255, 255, 0.7)",
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

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: EditFormData;
  onChange: (data: EditFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  plans: Plan[];
  paymentMethods: PaymentMethod[];
}

const EditClientModal: React.FC<EditClientModalProps> = ({
  isOpen,
  onClose,
  formData,
  onChange,
  onSubmit,
  plans,
  paymentMethods,
}) => {
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    let updatedValue: string | number | boolean = value;

    if (name === "planId" || name === "paymentMethodId") {
      updatedValue = parseInt(value, 10);
    } else if (name === "grossAmount") {
      updatedValue = parseFloat(value);
    } else if (name === "isActive") {
      updatedValue = value === "true";
    }

    onChange({ ...formData, [name]: updatedValue });
    console.log(`Campo ${name} alterado:`, updatedValue);
  };

  const handlePlanChange = (selectedOption: SelectOption) => {
    const updatedValue = selectedOption
      ? parseInt(selectedOption.value, 10)
      : 0;
    onChange({ ...formData, planId: updatedValue });
    console.log("planId alterado:", updatedValue);
  };

  const handlePaymentMethodChange = (selectedOption: SelectOption) => {
    const updatedValue = selectedOption
      ? parseInt(selectedOption.value, 10)
      : 0;
    onChange({ ...formData, paymentMethodId: updatedValue });
    console.log("paymentMethodId alterado:", updatedValue);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...formData, isActive: e.target.checked });
    console.log("isActive alterado:", e.target.checked);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Dados enviados para o submit:", formData);
    onSubmit(e);
  };

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const planOptions = [
    { value: "0", label: "Selecione um plano" },
    ...plans.map((plan) => ({
      value: plan.id.toString(),
      label: plan.name,
    })),
  ];

  const paymentMethodOptions = [
    { value: "0", label: "Selecione um método" },
    ...paymentMethods.map((method) => ({
      value: method.id.toString(),
      label: method.name,
    })),
  ];

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
      <div
        className="relative bg-[var(--dashboard-bg)] backdrop-blur-md rounded-xl shadow-lg p-5 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium text-[var(--text-secondary)]">
            Editar Cliente
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-primary)] hover:text-[var(--accent-blue)] transition-colors duration-300"
          >
            <FaTimes size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-[var(--text-primary)] mb-1">
              Nome
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-[var(--text-primary)] mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-[var(--text-primary)] mb-1">
              Telefone
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-[var(--text-primary)] mb-1">
              Plano
            </label>
            <Select
              options={planOptions}
              value={planOptions.find(
                (option) => option.value === formData.planId.toString()
              )}
              onChange={handlePlanChange}
              styles={customStyles}
              placeholder="Selecione um plano"
              isSearchable={false}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-[var(--text-primary)] mb-1">
              Método de Pagamento
            </label>
            <Select
              options={paymentMethodOptions}
              value={paymentMethodOptions.find(
                (option) => option.value === formData.paymentMethodId.toString()
              )}
              onChange={handlePaymentMethodChange}
              styles={customStyles}
              placeholder="Selecione um método"
              isSearchable={false}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-[var(--text-primary)] mb-1">
              Data de Vencimento
            </label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-[var(--text-primary)] mb-1">
              Valor Bruto
            </label>
            <input
              type="number"
              name="grossAmount"
              value={formData.grossAmount}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-[var(--text-primary)] mb-1">
              Observações
            </label>
            <textarea
              name="observations"
              value={formData.observations || ""}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
              placeholder="Sem observações"
            />
          </div>
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleCheckboxChange}
              className="mr-2 rounded text-[var(--accent-blue)] focus:ring-[var(--accent-blue)] bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.3)]"
            />
            <label className="text-sm text-[var(--text-primary)]">Ativo</label>
          </div>
          <button type="submit" className="new-client-button w-full">
            Salvar
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditClientModal;