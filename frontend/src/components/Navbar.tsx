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
    localStorage.removeItem("refreshToken");
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
      { href: "/clients", icon: <MdOutlineTableView />, label: "Clientes" },
      { href: "/expired", icon: <BsDatabaseX />, label: "Notificações" },
    ],
    []
  );

  return (
    // MUDANÇA: Removido o bg-gray e backdrop-blur. Adicionado um box-shadow com cor escura e pouca opacidade.
    <nav
      className="text-white p-3 fixed top-0 left-0 right-0 z-50 transition-shadow duration-300"
      style={{
        // A sombra sutil cria a profundidade necessária sem adicionar cor de fundo.
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      }}
    >
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex justify-center w-full space-x-12">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className="group flex h-16 w-16 items-center justify-center rounded-full"
            >
              <span
                className={`transition-all duration-300 ease-in-out ${
                  activeIcon?.startsWith(item.href)
                    ? "text-5xl"
                    : "text-3xl group-hover:scale-125"
                }`}
                style={{
                  color: activeIcon?.startsWith(item.href)
                    ? "#F1916D"
                    : "#AE7DAC",
                }}
              >
                {item.icon}
              </span>
            </Link>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-full text-white font-semibold
                     bg-red-600 hover:bg-red-700 
                     transition-colors duration-300"
        >
          Sair
        </button>
      </div>
    </nav>
  );
}
