import { createClient } from "@/lib/supabase/server";
import { resolveBusiness } from "@/lib/khata/business-active";
import ImportClient from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const db = await createClient();
  const { active } = await resolveBusiness(db);
  return (
    <ImportClient
      businessId={active?.id ?? ""}
      businessName={active?.name ?? "this business"}
    />
  );
}
