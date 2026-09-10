import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, isLang, translate, type Lang } from "@/lib/i18n-dict";

export async function getLang(): Promise<Lang> {
  try {
    const v = (await cookies()).get(LANG_COOKIE)?.value;
    if (isLang(v)) return v;
  } catch {
    /* ignore */
  }
  return "en";
}

/** Server-side translator: `const t = await serverT(); t("dash.sales")` */
export async function serverT(): Promise<
  (key: string, fallback?: string, vars?: Record<string, string | number>) => string
> {
  const lang = await getLang();
  return (key, fallback, vars) => translate(lang, key, fallback, vars);
}
