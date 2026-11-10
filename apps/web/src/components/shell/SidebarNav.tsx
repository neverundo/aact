"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import {
  FaBuilding,
  FaCalendarAlt,
  FaCreditCard,
  FaEnvelope,
  FaFileAlt,
  FaHome,
  FaLink,
  FaMoneyBillWave,
  FaPercent,
  FaPlug,
  FaShieldAlt,
  FaUsers,
  FaWallet,
} from "react-icons/fa";
import {
  isNavItemActive,
  type NavGroup,
  type NavIconName,
} from "@/lib/nav";
import { useShell } from "./ShellProvider";

const navIcons: Record<NavIconName, IconType> = {
  home: FaHome,
  building: FaBuilding,
  calendar: FaCalendarAlt,
  money: FaMoneyBillWave,
  envelope: FaEnvelope,
  users: FaUsers,
  creditCard: FaCreditCard,
  plug: FaPlug,
  percent: FaPercent,
  shield: FaShieldAlt,
  file: FaFileAlt,
  wallet: FaWallet,
  link: FaLink,
};

export function SidebarNav({
  groups,
  collapsed,
}: {
  groups: NavGroup[];
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const { setMobileOpen } = useShell();
  const [hash, setHash] = useState("");

  useEffect(() => {
    function syncHash() {
      setHash(window.location.hash);
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  return (
    <nav aria-label="Principal" className="flex flex-col gap-6 px-3 py-4">
      {groups.map((group) => (
        <div key={group.id} className="space-y-1">
          {!collapsed ? (
            <p className="px-2 text-xs font-medium tracking-wide text-stone-400 uppercase">
              {group.label}
            </p>
          ) : (
            <span className="sr-only">{group.label}</span>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isNavItemActive(item.href, pathname, hash);
              const Icon = navIcons[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.label}
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      setMobileOpen(false);
                      const nextHash = item.href.includes("#")
                        ? item.href.split("#")[1]
                        : null;
                      if (nextHash) {
                        window.setTimeout(() => {
                          document
                            .getElementById(nextHash)
                            ?.scrollIntoView({ behavior: "smooth" });
                          setHash(`#${nextHash}`);
                        }, 0);
                      }
                    }}
                    className={[
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                      collapsed ? "justify-center gap-0" : "justify-start",
                      active
                        ? "bg-stone-900 text-white"
                        : "text-stone-700 hover:bg-stone-100",
                    ].join(" ")}
                  >
                    <Icon
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0"
                    />
                    {!collapsed ? <span>{item.label}</span> : (
                      <span className="sr-only">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
