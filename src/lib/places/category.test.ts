import { describe, expect, it } from "vitest";
import { convertTypes } from "./category";

describe("convertTypes", () => {
	it("japanese_restaurant を 和食 に変換する", () => {
		expect(convertTypes(["japanese_restaurant"])).toBe("和食");
	});

	it("ramen_restaurant を ラーメン に変換する", () => {
		expect(convertTypes(["ramen_restaurant", "restaurant"])).toBe("ラーメン");
	});

	it("cafe を カフェ に変換する", () => {
		expect(convertTypes(["cafe", "establishment"])).toBe("カフェ");
	});

	it("bar を バー・居酒屋 に変換する", () => {
		expect(convertTypes(["bar"])).toBe("バー・居酒屋");
	});

	it("restaurant（汎用）を レストラン に変換する", () => {
		expect(convertTypes(["restaurant"])).toBe("レストラン");
	});

	it("マッチしない場合は null を返す", () => {
		expect(convertTypes(["shopping_mall"])).toBeNull();
	});

	it("undefined は null を返す", () => {
		expect(convertTypes(undefined)).toBeNull();
	});

	it("空配列は null を返す", () => {
		expect(convertTypes([])).toBeNull();
	});

	it("優先度が高い順に変換する（japanese_restaurant > restaurant）", () => {
		expect(convertTypes(["restaurant", "japanese_restaurant"])).toBe("和食");
	});
});
