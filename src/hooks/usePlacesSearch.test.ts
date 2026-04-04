import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlacesSearch } from "./usePlacesSearch";

const MOCK_CANDIDATES = [
	{
		placeId: "place-1",
		name: "テスト焼肉",
		address: "東京都渋谷区...",
		priceRange: "¥3,000〜¥5,999",
		rating: 4.2,
		photoUrl: null,
	},
];

describe("usePlacesSearch", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => MOCK_CANDIDATES,
			})
		);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("初期状態では candidates が空", () => {
		const { result } = renderHook(() => usePlacesSearch());
		expect(result.current.candidates).toEqual([]);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("search を呼ぶと 300ms 後に fetch が実行される", async () => {
		const { result } = renderHook(() => usePlacesSearch());

		act(() => {
			result.current.search("焼肉");
		});

		expect(vi.mocked(fetch)).not.toHaveBeenCalled();

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		expect(vi.mocked(fetch)).toHaveBeenCalledWith(
			"/api/shops/places/search?q=%E7%84%BC%E8%82%89",
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		);
	});

	it("fetch が成功すると candidates が更新される", async () => {
		const { result } = renderHook(() => usePlacesSearch());

		await act(async () => {
			result.current.search("焼肉");
			vi.advanceTimersByTime(300);
		});

		// resolve を待つ
		await act(async () => {
			await Promise.resolve();
		});

		expect(result.current.candidates).toEqual(MOCK_CANDIDATES);
		expect(result.current.isLoading).toBe(false);
	});

	it("fetch が失敗するとエラーが設定される", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: async () => ({ error: "検索に失敗しました" }),
			})
		);

		const { result } = renderHook(() => usePlacesSearch());

		await act(async () => {
			result.current.search("焼肉");
			vi.advanceTimersByTime(300);
		});

		await act(async () => {
			await Promise.resolve();
		});

		expect(result.current.error).toBe("検索に失敗しました");
		expect(result.current.candidates).toEqual([]);
	});

	it("空文字で search を呼ぶと候補がクリアされる", () => {
		const { result } = renderHook(() => usePlacesSearch());

		act(() => {
			result.current.search("");
		});

		expect(result.current.candidates).toEqual([]);
	});

	it("clear を呼ぶと状態がリセットされる", async () => {
		const { result } = renderHook(() => usePlacesSearch());

		await act(async () => {
			result.current.search("焼肉");
			vi.advanceTimersByTime(300);
		});

		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			result.current.clear();
		});

		expect(result.current.candidates).toEqual([]);
		expect(result.current.error).toBeNull();
	});
});
