import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TAGS, useTagSuggest } from "./useTagSuggest";

const MOCK_TAGS = [
	{ id: "tag-1", name: "行った" },
	{ id: "tag-2", name: "カスタムタグ" },
];

describe("useTagSuggest", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => MOCK_TAGS,
			})
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("初期状態では userTags が空でローディング中", () => {
		const { result } = renderHook(() => useTagSuggest());
		expect(result.current.userTags).toEqual([]);
		expect(result.current.isLoading).toBe(true);
	});

	it("fetch 完了後に userTags が設定される", async () => {
		const { result } = renderHook(() => useTagSuggest());

		await act(async () => {
			await Promise.resolve();
		});

		expect(result.current.userTags).toEqual(MOCK_TAGS);
		expect(result.current.isLoading).toBe(false);
	});

	it("fetch が失敗しても userTags が空のまま（クラッシュしない）", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: async () => ({}),
			})
		);

		const { result } = renderHook(() => useTagSuggest());

		await act(async () => {
			await Promise.resolve();
		});

		expect(result.current.userTags).toEqual([]);
		expect(result.current.isLoading).toBe(false);
	});

	it("DEFAULT_TAGS には行きたい・スタメン入り・行った が含まれる", () => {
		expect(DEFAULT_TAGS).toContain("行きたい");
		expect(DEFAULT_TAGS).toContain("スタメン入り");
		expect(DEFAULT_TAGS).toContain("行った");
	});
});
