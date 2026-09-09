import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Toaster from "@/components/Toaster";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-paper shadow-[0_0_80px_rgba(28,46,32,0.07)]">
      <AppHeader />
      <main className="flex-1 px-5 pb-28 pt-4">{children}</main>
      <BottomNav />
      <ServiceWorkerRegister />
      <Toaster />
    </div>
  );
}
