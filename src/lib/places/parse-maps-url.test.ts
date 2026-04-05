import { afterEach, describe, expect, it, vi } from "vitest";
import { extractPlaceIdFromUrl } from "./parse-maps-url";

describe("extractPlaceIdFromUrl", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("無効なURL", () => {
		it("空文字は null を返す", async () => {
			expect(await extractPlaceIdFromUrl("")).toBeNull();
		});

		it("不正な文字列は null を返す", async () => {
			expect(await extractPlaceIdFromUrl("not-a-url")).toBeNull();
		});
	});

	describe("パターン1: place_id クエリパラメータ", () => {
		it("place_id パラメータがある場合は { placeId } を返す", async () => {
			const url = "https://www.google.com/maps?place_id=ChIJN1t_tDeuEmsRUsoyG83frY4";
			expect(await extractPlaceIdFromUrl(url)).toEqual({
				placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
			});
		});

		it("他のクエリパラメータと混在していても place_id を取得できる", async () => {
			const url = "https://www.google.com/maps?q=sushi&place_id=ChIJabc123&zoom=14";
			expect(await extractPlaceIdFromUrl(url)).toEqual({
				placeId: "ChIJabc123",
			});
		});
	});

	describe("パターン2: /maps/place/<name>/ パス", () => {
		it("通常のGoogle マップ store URL からキーワードを抽出する", async () => {
			const url =
				"https://www.google.com/maps/place/%E3%82%B9%E3%82%B7%E3%83%AD+%E9%8A%80%E5%BA%A7/data=xxx";
			expect(await extractPlaceIdFromUrl(url)).toEqual({
				keyword: "スシロ 銀座",
			});
		});

		it("ASCII の店舗名を抽出する", async () => {
			const url = "https://www.google.com/maps/place/Sushiro/data=xxx";
			expect(await extractPlaceIdFromUrl(url)).toEqual({ keyword: "Sushiro" });
		});

		it("+ エンコードされたスペースをスペースに変換する", async () => {
			const url = "https://www.google.com/maps/place/Sushi+Ginza/data=xxx";
			expect(await extractPlaceIdFromUrl(url)).toEqual({
				keyword: "Sushi Ginza",
			});
		});

		it("ネストされたパスでもキーワードを抽出できる", async () => {
			const url = "https://www.google.com/maps/place/Ramen+Shop/@35.6895,139.6917,17z";
			expect(await extractPlaceIdFromUrl(url)).toEqual({
				keyword: "Ramen Shop",
			});
		});
	});

	describe("パターン3: Short URL の展開", () => {
		it("goo.gl のショートURLを展開して place_id を抽出する", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({
					url: "https://www.google.com/maps?place_id=ChIJExpanded123",
				})
			);

			const result = await extractPlaceIdFromUrl("https://goo.gl/maps/abc");
			expect(result).toEqual({ placeId: "ChIJExpanded123" });
			expect(vi.mocked(fetch)).toHaveBeenCalledWith("https://goo.gl/maps/abc", {
				method: "HEAD",
				redirect: "follow",
			});
		});

		it("maps.app.goo.gl のショートURLを展開してキーワードを抽出する", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({
					url: "https://www.google.com/maps/place/Yakiniku+Taro/data=xyz",
				})
			);

			const result = await extractPlaceIdFromUrl("https://maps.app.goo.gl/xyz");
			expect(result).toEqual({ keyword: "Yakiniku Taro" });
		});

		it("ショートURL展開が失敗した場合は null を返す", async () => {
			vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

			const result = await extractPlaceIdFromUrl("https://goo.gl/maps/abc");
			expect(result).toBeNull();
		});

		it("展開後のURLもパターンに一致しない場合は null を返す", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({
					url: "https://www.google.com/maps",
				})
			);

			const result = await extractPlaceIdFromUrl("https://goo.gl/maps/abc");
			expect(result).toBeNull();
		});

		it("depth=1 ではショートURL展開をしない（再帰は最大1回）", async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				url: "https://maps.app.goo.gl/another-short-url",
			});
			vi.stubGlobal("fetch", fetchMock);

			// _depth=1 で呼び出すと goo.gl でも fetch しない
			const result = await extractPlaceIdFromUrl("https://maps.app.goo.gl/abc", 1);
			expect(result).toBeNull();
			expect(fetchMock).not.toHaveBeenCalled();
		});
	});

	describe("いずれのパターンにも一致しない", () => {
		it("Google マップ URL でもパターン非該当の場合は null を返す", async () => {
			const url = "https://www.google.com/maps/@35.6895,139.6917,17z";
			expect(await extractPlaceIdFromUrl(url)).toBeNull();
		});

		it("Google マップ以外のURLは null を返す", async () => {
			const url = "https://example.com/restaurant/123";
			expect(await extractPlaceIdFromUrl(url)).toBeNull();
		});
	});
});
