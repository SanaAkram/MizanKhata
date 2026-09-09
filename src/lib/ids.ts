/** Short, app-generated id — mirrors the scheme used in the original app.html. */
export function newId(prefix = ""): string {
  return (
    prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  );
}
