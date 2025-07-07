"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { toast } from "react-toastify";
import { TbLayoutDashboardFilled } from "react-icons/tb";
import { MdOutlineTableView } from "react-icons/md";
import { BsDatabaseX } from "react-icons/bs";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeIcon, setActiveIcon] = useState<string | null>(pathname);

  useEffect(() => {
    setActiveIcon(pathname);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logout realizado com sucesso!");
    router.push("/");
  };

  const navItems = useMemo(
    () => [
      {
        href: "/dashboard",
        icon: <TbLayoutDashboardFilled />,
        label: "Dashboard",
      },
      {
        href: "/clients",
        icon: <MdOutlineTableView />,
        label: "Clientes",
      },
      {
        href: "/expired",
        icon: <BsDatabaseX />,
        label: "Notificações",
      },
    ],
    []
  );

  const handleIconClick = (href: string) => {
    setActiveIcon(href);
    router.push(href);
  };

  return (
    <nav
      className="text-white p-3 fixed top-0 left-0 right-0 z-50 border-opacity-30 border-white"
      style={{
        borderBottomLeftRadius: "10px",
        borderBottomRightRadius: "10px",
        borderTopLeftRadius: "0",
        borderTopRightRadius: "0",
      }}
    >
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex justify-center w-full space-x-12">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => handleIconClick(item.href)}
              // AQUI ESTÁ A MUDANÇA PRINCIPAL:
              // Criamos um container de tamanho fixo (w-16 h-16) para cada ícone.
              // Agora, o ícone pode mudar de tamanho internamente sem afetar o layout externo.
              className="group flex h-16 w-16 items-center justify-center rounded-full"
            >
              <span
                // O span agora só controla a aparência do ícone, sem impactar o layout.
                // Usei `scale` no hover para um efeito de crescimento mais suave e sem quebrar o layout.
                className={`transition-all duration-300 ease-in-out ${
                  activeIcon === item.href
                    ? "text-5xl" // Ícone ativo fica grande
                    : "text-3xl group-hover:scale-125" // Ícone inativo cresce com zoom no hover
                }`}
                style={{
                  color: activeIcon === item.href ? "#F1916D" : "#AE7DAC",
                }}
              >
                {item.icon}
              </span>
            </Link>
          ))}
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-full transition-all duration-300"
          style={{
            backgroundColor: "#e63946",
            color: "#FFFFFF",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#b82e38")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "#e63946")
          }
        >
          Sair
        </button>
      </div>
    </nav>
  );
}
