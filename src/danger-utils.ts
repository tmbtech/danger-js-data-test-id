export function extractAttrValueFromLine(attr: string, line: string): { present: boolean; value: string | null } {
  const attrEq = new RegExp(`${attr}\\s*=`, "i");
  if (!attrEq.test(line)) return { present: false, value: null };

  const quoted = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i");
  const inBracesQuoted = new RegExp(`${attr}\\s*=\\s*{\\s*["']([^"']+)["']\\s*}`, "i");
  const inBracesTemplate = new RegExp(`${attr}\\s*=\\s*{\\s*\\` + "`" + `([^\\` + "`" + `]*)\\` + "`" + `\\s*}`, "i");

  const m1 = line.match(quoted);
  if (m1) return { present: true, value: m1[1] };

  const m2 = line.match(inBracesQuoted);
  if (m2) return { present: true, value: m2[1] };

  const m3 = line.match(inBracesTemplate);
  if (m3) return { present: true, value: m3[1] };

  return { present: true, value: "(non-literal expression)" };
}
