"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GearIcon } from "@/components/icons";
import { useT } from "@/lib/i18n";

const TITLE_PATHS = [
  "/work",
  "/routine",
  "/ledger",
  "/orders",
  "/cashbook",
  "/shop/pos",
  "/shop/stock",
  "/shop/bills",
  "/shop/expense",
  "/shop/reports",
  "/shop/settings",
  "/shop",
  "/settings",
];

const PREFIXES = ["/routine", "/work", "/ledger", "/orders", "/cashbook", "/shop"];

export default function AppHeader() {
  const pathname = usePathname();
  const t = useT();
  const exact = TITLE_PATHS.find((p) => pathname === p);
  const prefix = PREFIXES.find((p) => pathname.startsWith(p));
  const key = exact ?? prefix;
  const title = key ? t(`title.${key}`, "MizanKhata") : "MizanKhata";

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-line bg-paper px-5 py-3.5">
      <div className="flex items-baseline gap-2">
        <span className="numeric text-lg font-semibold text-forest">
          {title}
        </span>
      </div>
      {pathname !== "/settings" ? (
        <Link
          href="/settings"
          aria-label="Settings"
          className="-mr-1 rounded-lg p-1 text-muted active:bg-line"
        >
          <GearIcon className="h-[22px] w-[22px]" />
        </Link>
      ) : (
        <Link href="/work" className="text-sm font-medium text-muted">
          {t("c.done", "Done")}
        </Link>
      )}
    </header>
  );
}
