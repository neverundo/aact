"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { LuBriefcaseBusiness, LuMailPlus } from "react-icons/lu";
import { MdOutlineSpaceDashboard, MdSecurity } from "react-icons/md";
import {
  SlCreditCard,
  SlDoc,
  SlLink,
  SlPeople,
  SlPuzzle,
  SlWallet,
} from "react-icons/sl";
import { TbContract, TbTimelineEventText } from "react-icons/tb";
import { VscGitPullRequestComment } from "react-icons/vsc";
import {
  isNavItemActive,
  type NavGroup,
  type NavIconName,
} from "@/lib/nav";
import { useShell } from "./ShellProvider";

const navIcons: Record<NavIconName, IconType> = {
  home: MdOutlineSpaceDashboard,
  building: LuBriefcaseBusiness,
  calendar: TbTimelineEventText,
  money: VscGitPullRequestComment,
  envelope: LuMailPlus,
  users: SlPeople,
  creditCard: SlCreditCard,
  plug: SlPuzzle,
  percent: TbContract,
  shield: MdSecurity,
  file: SlDoc,
  wallet: SlWallet,
  link: SlLink,
};

export function SidebarNav({
  groups,
  collapsed,
}: {
  groups: NavGroup[];
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations();
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
    <nav aria-label={t("common.mainNav")} className="flex flex-col gap-6 px-3 py-4">
      {groups.map((group) => {
        const groupLabel = t(group.labelKey);
        return (
          <div key={group.id} className="space-y-1">
            {!collapsed ? (
              <p className="px-2 text-xs font-medium tracking-wide text-stone-400 uppercase">
                {groupLabel}
              </p>
            ) : (
              <span className="sr-only">{groupLabel}</span>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavItemActive(item.href, pathname, hash);
                const Icon = navIcons[item.icon];
                const label = t(item.labelKey);
                const shortLabel = item.shortLabelKey
                  ? t(item.shortLabelKey)
                  : label;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? shortLabel : label}
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
                      {!collapsed ? <span>{label}</span> : (
                        <span className="sr-only">{label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
