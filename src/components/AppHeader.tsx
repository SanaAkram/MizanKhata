"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GearIcon } from "@/components/icons";

const TITLES: Record<string, string> = {
  "/work": "Work",
  "/routine": "Routine",
  "/settings": "Settings",
};

export default function AppHeader() {
  const pathname = usePathname();
  const title =
    TITLES[pathname] ??
    (pathname.startsWith("/routine")
      ? "Routine"
      : pathname.startsWith("/work")
        ? "Work"
        : "Roznamcha");

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
