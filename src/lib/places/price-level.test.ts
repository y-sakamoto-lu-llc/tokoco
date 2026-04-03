import { describe, expect, it } from "vitest";
import { convertPriceLevel } from "./price-level";

describe("convertPriceLevel", () => {
	it("PRICE_LEVEL_FREE を 〜¥999 に変換する", () => {
		expect(convertPriceLevel("PRICE_LEVEL_FREE")).toBe("〜¥999");
	});

	it("PRICE_LEVEL_INEXPENSIVE を ¥1,000〜¥2,999 に変換する", () => {
		expect(convertPriceLevel("PRICE_LEVEL_INEXPENSIVE")).toBe("¥1,000〜¥2,999");
	});

	it("PRICE_LEVEL_MODERATE を ¥3,000〜¥5,999 に変換する", () => {
		expect(convertPriceLevel("PRICE_LEVEL_MODERATE")).toBe("¥3,000〜¥5,999");
	});

	it("PRICE_LEVEL_EXPENSIVE を ¥6,000〜¥9,999 に変換する", () => {
		expect(convertPriceLevel("PRICE_LEVEL_EXPENSIVE")).toBe("¥6,000〜¥9,999");
	});

	it("PRICE_LEVEL_VERY_EXPENSIVE を ¥10,000〜 に変換する", () => {
		expect(convertPriceLevel("PRICE_LEVEL_VERY_EXPENSIVE")).toBe("¥10,000〜");
	});

	it("undefined は 価格帯不明 に変換する", () => {
		expect(convertPriceLevel(undefined)).toBe("価格帯不明");
	});

	it("不明な値は 価格帯不明 に変換する", () => {
		expect(convertPriceLevel("UNKNOWN")).toBe("価格帯不明");
	});
});
