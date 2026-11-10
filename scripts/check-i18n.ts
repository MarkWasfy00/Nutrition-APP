import en from "../messages/en.json";
import ar from "../messages/ar-EG.json";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

const a = new Set(keys(en));
const b = new Set(keys(ar));
const missingInAr = [...a].filter((k) => !b.has(k));
const missingInEn = [...b].filter((k) => !a.has(k));
if (missingInAr.length || missingInEn.length) {
  console.error("Missing in ar-EG:", missingInAr);
  console.error("Missing in en:", missingInEn);
  process.exit(1);
}
console.log(`i18n OK: ${a.size} keys in both locales`);
