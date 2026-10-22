import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseSkuCsv } from "./sku-csv";

const csv = fs.readFileSync(path.join(process.cwd(), "data", "rakuten-products.csv"), "utf8");

describe("parseSkuCsv", () => {
  const parsed = parseSkuCsv(csv);

  it("imports every variant and skips the delisted MP004 row", () => {
    expect(parsed.failed).toEqual([]);
    expect(parsed.excluded).toEqual([
      expect.objectContaining({ row: 95, code: "MP004", name: "丸久小山園 和光 40g", reason: "排除清單" }),
    ]);
    expect(parsed.skus.some((sku) => sku.code === "MP004")).toBe(false);
    expect(parsed.skus).toHaveLength(283);
  });

  it("keeps 和光 as two spaced variants and prices 中煎 from the option", () => {
    const wako = parsed.skus.filter((sku) => sku.name === "丸久小山園 和光").map((sku) => sku.variant);
    expect(wako.sort()).toEqual(["100g 袋", "40g 罐"]);
    const chusen = parsed.skus.filter((sku) => sku.code === "HJ004");
    expect(chusen.map((sku) => [sku.variant, sku.salePrice, sku.cost]).sort()).toEqual([
      ["30g罐", 380, 176],
      ["80g袋", 520, 304],
    ]);
  });

  it("expands spec combinations without adding the parent price", () => {
    const dinosaurs = parsed.skus.filter((sku) => sku.code === "TH002");
    expect(dinosaurs).toHaveLength(12);
    expect(dinosaurs.every((sku) => sku.salePrice === 660)).toBe(true);
    const spoon = dinosaurs.find((sku) => sku.variant === "圓形勺／a");
    expect(spoon?.cost).toBe(446);
    const set = parsed.skus.find((sku) => sku.code === "SET001" && sku.variant.startsWith("抹茶綠／") && sku.variant.includes("銀色"));
    expect(set?.salePrice).toBe(3150);
    expect(set?.cost).toBe(2309);
    expect(parsed.skus.filter((sku) => sku.code === "SET001")).toHaveLength(45);
  });

  it("rejects a broken option row and uses a positive spec-two price as the full price", () => {
    const tiny = parseSkuCsv(
      [
        "商品編號,商品名稱,價格,成本,分類,次分類(用||分隔),規格標題,規格選項(名稱:價格:成本:庫存),規格二標題,規格二選項(名稱:價格:成本:庫存)",
        "SETX,組合,3150,1000,茶,品牌,,色A:0:0:0,,組1:5000:2000:0|組2:0:0:0",
        "BAD,壞掉,10,1,茶,品牌,,只有名稱,,",
        "MP004,舊和光,1500,952,茶,品牌,,,,,",
      ].join("\n"),
    );
    expect(tiny.failed).toEqual([expect.objectContaining({ row: 3, reason: "規格格式不對：只有名稱" })]);
    expect(tiny.excluded.map((row) => row.code)).toEqual(["MP004"]);
    expect(tiny.skus.map((sku) => [sku.variant, sku.salePrice, sku.cost])).toEqual([
      ["色A／組1", 5000, 2000],
      ["色A／組2", 3150, 1000],
    ]);
  });
});
