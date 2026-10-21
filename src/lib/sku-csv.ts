import { createHash } from "crypto";

/** Delisted products. Re-imports skip these codes and never recreate them. */
export const SKU_IMPORT_EXCLUDED_CODES = new Set(["MP004"]);

export type ParsedSku = {
  id: string;
  importKey: string;
  code: string | null;
  name: string;
  variant: string;
  category: string | null;
  subcategory: string | null;
  salePrice: number;
  cost: number;
};

export type SkuCsvIssue = { row: number; reason: string; code?: string; name?: string };

export type SkuCsvResult = {
  skus: ParsedSku[];
  excluded: SkuCsvIssue[];
  failed: SkuCsvIssue[];
};

const OPTION_COLUMN = "規格選項(名稱:價格:成本:庫存)";
const OPTION2_COLUMN = "規格二選項(名稱:價格:成本:庫存)";

export function skuLabel(sku: { code?: string | null; name: string; variant?: string | null; subcategory?: string | null }) {
  const head = [sku.code, sku.name, sku.variant].filter(Boolean).join(" ");
  return sku.subcategory ? `${head} · ${sku.subcategory}` : head;
}

export function skuIdFor(importKey: string) {
  return `sku_${createHash("sha256").update(importKey).digest("hex").slice(0, 24)}`;
}

export function parseCsv(text: string) {
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char === "\r") continue;
    cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function blankToNull(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function parseMoney(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return 0;
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

function parseOptions(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true as const, options: [] as { name: string; price: number; cost: number }[] };
  const options: { name: string; price: number; cost: number }[] = [];
  for (const part of trimmed.split("|")) {
    const piece = part.trim();
    if (!piece) continue;
    const bits = piece.split(":");
    if (bits.length < 3) return { ok: false as const, reason: `規格格式不對：${piece}` };
    const costRaw = bits.length >= 4 ? bits[bits.length - 2] : bits[2];
    const priceRaw = bits.length >= 4 ? bits[bits.length - 3] : bits[1];
    const name = (bits.length >= 4 ? bits.slice(0, bits.length - 3) : [bits[0]]).join(":").trim();
    if (!name) return { ok: false as const, reason: "規格沒有名稱" };
    const price = parseMoney(priceRaw);
    const cost = parseMoney(costRaw);
    if (price == null || cost == null) return { ok: false as const, reason: `規格金額不對：${piece}` };
    options.push({ name, price, cost });
  }
  return { ok: true as const, options };
}

function prefer(primary: number, fallback: number) {
  return primary > 0 ? primary : fallback;
}

export function parseSkuCsv(text: string): SkuCsvResult {
  const table = parseCsv(text);
  const header = table[0] ?? [];
  const index = new Map(header.map((name, position) => [name.trim(), position]));
  const column = (row: string[], name: string) => row[index.get(name) ?? -1] ?? "";
  const skus: ParsedSku[] = [];
  const excluded: SkuCsvIssue[] = [];
  const failed: SkuCsvIssue[] = [];
  const seen = new Set<string>();

  table.slice(1).forEach((row, offset) => {
    const rowNumber = offset + 2;
    if (!row.some((cell) => cell.trim())) return;
    const code = blankToNull(column(row, "商品編號"));
    const name = (column(row, "商品名稱") ?? "").trim();
    if (code && SKU_IMPORT_EXCLUDED_CODES.has(code)) {
      excluded.push({ row: rowNumber, code, name, reason: "排除清單" });
      return;
    }
    if (!name) {
      failed.push({ row: rowNumber, code: code ?? undefined, reason: "沒有商品名稱" });
      return;
    }
    const parentPrice = parseMoney(column(row, "價格"));
    const parentCost = parseMoney(column(row, "成本"));
    if (parentPrice == null || parentCost == null) {
      failed.push({ row: rowNumber, code: code ?? undefined, name, reason: "價格或成本不是整數" });
      return;
    }
    const first = parseOptions(column(row, OPTION_COLUMN));
    if (!first.ok) {
      failed.push({ row: rowNumber, code: code ?? undefined, name, reason: first.reason });
      return;
    }
    const second = parseOptions(column(row, OPTION2_COLUMN));
    if (!second.ok) {
      failed.push({ row: rowNumber, code: code ?? undefined, name, reason: second.reason });
      return;
    }
    const category = blankToNull(column(row, "分類"));
    const subcategory = blankToNull(
      column(row, "次分類(用||分隔)")
        .split("||")
        .map((part) => part.trim())
        .filter(Boolean)
        .join("||"),
    );
    const combos =
      second.options.length === 0
        ? first.options.length === 0
          ? [{ variant: "", price: parentPrice, cost: parentCost }]
          : first.options.map((option) => ({
              variant: option.name,
              price: prefer(option.price, parentPrice),
              cost: prefer(option.cost, parentCost),
            }))
        : (first.options.length === 0 ? [{ name: "", price: 0, cost: 0 }] : first.options).flatMap((left) =>
            second.options.map((right) => ({
              variant: left.name ? `${left.name}／${right.name}` : right.name,
              price: right.price > 0 ? right.price : prefer(left.price, parentPrice),
              cost: right.cost > 0 ? right.cost : prefer(left.cost, parentCost),
            })),
          );

    for (const combo of combos) {
      const importKey = `${code ? `c:${code}` : `n:${name}`}\u001f${combo.variant}`;
      if (seen.has(importKey)) {
        failed.push({ row: rowNumber, code: code ?? undefined, name, reason: `規格重複：${combo.variant || name}` });
        continue;
      }
      seen.add(importKey);
      skus.push({
        id: skuIdFor(importKey),
        importKey,
        code,
        name,
        variant: combo.variant,
        category,
        subcategory,
        salePrice: combo.price,
        cost: combo.cost,
      });
    }
  });

  return { skus, excluded, failed };
}
