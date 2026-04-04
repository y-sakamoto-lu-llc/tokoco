import { describe, expect, it } from "vitest";
import { convertBusinessHours, extractArea } from "./area";

describe("extractArea", () => {
	it("都道府県と市区町村を組み合わせてエリアを生成する", () => {
		const components = [
			{ longText: "東京都", types: ["administrative_area_level_1", "political"] },
			{ longText: "渋谷区", types: ["locality", "political"] },
		];
		expect(extractArea(components)).toBe("東京都渋谷区");
	});

	it("都道府県のみの場合は都道府県を返す", () => {
		const components = [
			{ longText: "大阪府", types: ["administrative_area_level_1", "political"] },
		];
		expect(extractArea(components)).toBe("大阪府");
	});

	it("都道府県がない場合は null を返す", () => {
		const components = [{ longText: "渋谷区", types: ["locality", "political"] }];
		expect(extractArea(components)).toBeNull();
	});

	it("空配列は null を返す", () => {
		expect(extractArea([])).toBeNull();
	});
});

describe("convertBusinessHours", () => {
	it("曜日別の営業時間を改行区切りの文字列に変換する", () => {
		const hours = ["月曜日: 11:00–23:00", "火曜日: 11:00–23:00"];
		expect(convertBusinessHours(hours)).toBe("月曜日: 11:00–23:00\n火曜日: 11:00–23:00");
	});

	it("undefined は null を返す", () => {
		expect(convertBusinessHours(undefined)).toBeNull();
	});

	it("空配列は null を返す", () => {
		expect(convertBusinessHours([])).toBeNull();
	});
});
