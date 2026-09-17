export type TranslateParams = Record<string, string | number>;

function readPath(dict: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc !== null && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
}

export function translate(dict: unknown, key: string, params?: TranslateParams): string {
  const value = readPath(dict, key);
  if (typeof value !== "string") return key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) => {
    const param = params[name];
    return param === undefined ? match : String(param);
  });
}
