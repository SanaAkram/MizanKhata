import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/profile";

/** Order Book is a business-account feature. */
export default async function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if ((await getProfile())?.account_type === "personal") redirect("/work");
  return <>{children}</>;
}
