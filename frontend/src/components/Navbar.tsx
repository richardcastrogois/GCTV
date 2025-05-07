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
      className="text-white p-3 shadow-lg fixed top-0 left-0 right-0 z-50 border-b border-opacity-30 border-white"
      style={{
        background: "linear-gradient(135deg, #03122F, #19305C, #413B61)",
        borderBottomLeftRadius: "20px",
        borderBottomRightRadius: "20px",
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
              className="flex items-center group"
            >
              <span
                className={`transition-all duration-300 ${
                  activeIcon === item.href
                    ? "text-4xl"
                    : "text-3xl group-hover:text-3.5xl"
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
