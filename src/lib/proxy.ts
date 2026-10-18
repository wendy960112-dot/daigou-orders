export function parseProxyFields(value: string | null | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function formatProxyFields(fields: Set<string>) {
  const list = [...fields];
  return list.length > 0 ? list.join(",") : null;
}

export function hasProxy(value: string | null | undefined, key: string) {
  return parseProxyFields(value).has(key);
}
