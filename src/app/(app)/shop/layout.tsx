import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/profile";

/** Shop (POS, stock, bills) is a business-account feature. */
export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if ((await getProfile())?.account_type === "personal") redirect("/work");
  return <>{children}</>;
}
