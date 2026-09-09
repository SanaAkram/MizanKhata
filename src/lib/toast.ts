export type ToastKind = "info" | "error" | "success";

/** Fire an in-app toast. No-op on the server. */
export function toast(message: string, kind: ToastKind = "info"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("mk:toast", { detail: { message, kind } }),
  );
}
