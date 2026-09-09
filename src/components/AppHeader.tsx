"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GearIcon } from "@/components/icons";

const TITLES: Record<string, string> = {
  "/work": "Work",
  "/routine": "Routine",
  "/ledger": "Ledger",
  "/cashbook": "Cash Book",
  "/shop": "Shop",
  "/shop/pos": "Sell",
  "/shop/stock": "Stock",
  "/shop/bills": "Bills",
  "/shop/settings": "Shop details",
  "/settings": "Settings",
};

const PREFIXES: Array<[string, string]> = [
  ["/routine", "Routine"],
  ["/work", "Work"],
  ["/ledger", "Ledger"],
  ["/cashbook", "Cash Book"],
  ["/shop", "Shop"],
];

export default function AppHeader() {
  const pathname = usePathname();
  const title =
    TITLES[pathname] ??
    PREFIXES.find(([p]) => pathname.startsWith(p))?.[1] ??
    "Roznamcha";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/95 px-5 py-3.5 backdrop-blur">
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
          Done
        </Link>
      )}
    </header>
  );
}
