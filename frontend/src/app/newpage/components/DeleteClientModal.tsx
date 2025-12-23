// frontend/src/app/newpage/components/DeleteClientModal.tsx
"use client";

import React from "react";
import {
  Modal,
  ModalContent,
  ModalBody,
  Button,
  useDisclosure,
} from "@heroui/react";
import { Trash2, Loader2 } from "lucide-react";
import type { Client } from "@/types/client";
import { deleteClient } from "@/app/clients/api";
import { toast } from "react-hot-toast";

type Props = {
  client: Client;
  onDeleted: (id: number) => void;
};

const showSuccessToast = (title: string, description?: string) => {
  toast.dismiss();
  setTimeout(() => {
    toast.custom(
      (t) => (
        <div className={`hero-toast ${!t.visible ? "hero-toast--leave" : ""}`}>
          <div className="hero-toast-text">
            <div className="hero-toast-text-title">{title}</div>
            {description && (
              <div className="hero-toast-text-subtitle">{description}</div>
            )}
          </div>

          <button
            type="button"
            className="hero-toast-close"
            onClick={() => toast.dismiss(t.id)}
          >
            ×
          </button>
        </div>
      ),
      {
        position: "top-right",
        duration: 2000,
      }
    );
  }, 330);
};

const showErrorToast = (title: string, description?: string) => {
  toast.dismiss();

  setTimeout(() => {
    toast.custom(
      (t) => (
        <div
          className={`hero-toast hero-toast--error ${
            !t.visible ? "hero-toast--leave" : ""
          }`}
        >
          <div className="hero-toast-text">
            <div className="hero-toast-text-title hero-toast-text-title--error">
              {title}
            </div>
            {description && (
              <div className="hero-toast-text-subtitle hero-toast-text-subtitle--error">
                {description}
              </div>
            )}
          </div>

          <button
            type="button"
            className="hero-toast-close hero-toast-close--error"
            onClick={() => toast.dismiss(t.id)}
          >
            ×
          </button>
        </div>
      ),
      {
        position: "top-right",
        duration: 3000,
      }
    );
  }, 330);
};

const DeleteClientModal: React.FC<Props> = ({ client, onDeleted }) => {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleDelete = async () => {
    try {
      setIsLoading(true);

      await deleteClient(client.id);

      onDeleted(client.id);
      onClose();

      showSuccessToast("Usuário excluído com sucesso!");
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);

      showErrorToast("Erro ao excluir usuário.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botão da tabela */}
      <button
        onClick={onOpen}
        className="p-2 rounded-full hover:bg-rose-500/10 text-rose-600"
        aria-label="Excluir"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="center"
        backdrop="blur"
        classNames={{
          base: `
            bg-[#18181B]
            text-foreground
            rounded-2xl
            w-[92vw]
            max-w-[420px]
          `,
          backdrop: "backdrop-blur-md",
          closeButton: `
            right-3
            left-auto
            top-3
            text-foreground-500
            hover:bg-white/10
            active:bg-white/10
          `,
        }}
      >
        <ModalContent>
          <ModalBody className="py-9 px-7">
            <div className="flex flex-col items-center text-center gap-4">
              {/* ÍCONE */}
              <div className="w-20 h-20 flex items-center justify-center">
                <Trash2 className="w-20 h-20 text-rose-500" />
              </div>

              {/* TÍTULO */}
              <h2 className="text-2xl font-semibold text-white">
                Excluir {client.user?.username}?
              </h2>

              {/* DESCRIÇÃO */}
              <p className="text-base text-foreground-500 max-w-[320px]">
                Deseja realmente excluir o usuário selecionado?
              </p>

              {/* BOTÕES */}
              <div className="flex items-center gap-3 mt-4">
                <Button
                  onPress={handleDelete}
                  disabled={isLoading}
                  className="
                    rounded-xl
                    px-6
                    bg-rose-600
                    text-white
                    hover:bg-rose-800
                    data-[pressed=true]:scale-[0.97]
                  "
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Excluindo...
                    </span>
                  ) : (
                    "Sim, excluir"
                  )}
                </Button>

                <Button
                  variant="light"
                  onPress={onClose}
                  disabled={isLoading}
                  className="
                    rounded-xl
                    px-6
                    text-foreground-500
                    data-[hover=true]:bg-white/10
                  "
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default DeleteClientModal;