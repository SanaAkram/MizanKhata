import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Toaster from "@/components/Toaster";
import HtmlLang from "@/components/HtmlLang";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy middleware already ran getUser() (authoritative check + token
  // refresh) and redirected anons. Here we only need a cheap cookie read —
  // getSession() makes no network call — as a belt-and-braces guard.
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  return (
    // App shell: fixed-height column, only <main> scrolls. This avoids iOS
    // position:fixed bugs (floating nav, un-tappable footer bars).
    <div className="mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-paper shadow-[0_0_80px_rgba(28,46,32,0.07)]">
      <AppHeader />
      <main className="relative flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-4">
        {children}
      </main>
      <BottomNav />
      <ServiceWorkerRegister />
      <Toaster />
      <HtmlLang />
    </div>
  );
}
