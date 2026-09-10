"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClockIcon,
  CalendarIcon,
  LedgerIcon,
  ShopIcon,
} from "@/components/icons";
import { useT } from "@/lib/i18n";

const TABS = [
  { href: "/work", key: "nav.work", label: "Work", Icon: ClockIcon, biz: false },
  {
    href: "/routine",
    key: "nav.routine",
    label: "Routine",
    Icon: CalendarIcon,
    biz: false,
  },
  {
    href: "/ledger",
    key: "nav.ledger",
    label: "Ledger",
    Icon: LedgerIcon,
    biz: true,
  },
  { href: "/shop", key: "nav.shop", label: "Shop", Icon: ShopIcon, biz: true },
] as const;

export default function BottomNav({ personal }: { personal?: boolean }) {
  const pathname = usePathname();
  const t = useT();
  const tabs = personal ? TABS.filter((x) => !x.biz) : TABS;

  return (
    <nav className="shrink-0 border-t border-line bg-paper">
      <div className="flex w-full pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ href, key, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                active ? "text-forest" : "text-muted"
              }`}
            >
              <Icon className="h-6 w-6" />
              {t(key, label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
