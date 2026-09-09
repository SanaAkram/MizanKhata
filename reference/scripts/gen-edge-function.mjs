// Regenerates supabase-edge-function-index.ts from app.html.
// app.html is the canonical source; the edge function just embeds it as a
// string and serves it, to get a real https:// URL.
//
//   npm run gen:edge
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "app.html"), "utf8");

// JSON.stringify gives a valid JS string literal. Also escape U+2028 / U+2029,
// which are valid in JSON but were historically unsafe in JS string literals.
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const literal = JSON.stringify(html)
  .split(LS).join("\\u2028")
  .split(PS).join("\\u2029");

const ts = `import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const HTML = ${literal};

Deno.serve(async (req: Request) => {
  return new Response(HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});
`;

const out = join(root, "supabase-edge-function-index.ts");
writeFileSync(out, ts);
console.log(`wrote ${out} (${ts.length} chars, from app.html ${html.length} chars)`);
