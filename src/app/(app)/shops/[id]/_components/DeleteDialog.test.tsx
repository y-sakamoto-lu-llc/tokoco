import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteDialog } from "./DeleteDialog";

// next/navigation のモック
vi.mock("next/navigation", () => ({
	useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}));

// sonner のモック
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

describe("DeleteDialog", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 204,
				json: async () => ({}),
			})
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it("削除ボタンが表示される", () => {
		render(<DeleteDialog shopId="shop-1" shopName="テスト店舗" />);
		expect(screen.getByRole("button", { name: /削除/ })).toBeInTheDocument();
	});

	it("削除ボタンをクリックすると確認ダイアログが開く", async () => {
		render(<DeleteDialog shopId="shop-1" shopName="テスト店舗" />);
		fireEvent.click(screen.getByRole("button", { name: /削除/ }));
		expect(await screen.findByText("店舗を削除しますか？")).toBeInTheDocument();
		expect(screen.getByText(/テスト店舗/)).toBeInTheDocument();
	});

	it("キャンセルボタンでダイアログが閉じる", async () => {
		render(<DeleteDialog shopId="shop-1" shopName="テスト店舗" />);
		fireEvent.click(screen.getByRole("button", { name: /削除/ }));
		await screen.findByText("店舗を削除しますか？");

		fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
		await waitFor(() => {
			expect(screen.queryByText("店舗を削除しますか？")).not.toBeInTheDocument();
		});
	});

	it("確認ボタンをクリックすると DELETE リクエストが送信される", async () => {
		render(<DeleteDialog shopId="shop-1" shopName="テスト店舗" />);
		fireEvent.click(screen.getByRole("button", { name: /削除/ }));
		await screen.findByText("店舗を削除しますか？");

		const confirmButton = screen.getByRole("button", { name: "削除する" });
		fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/shops/shop-1", { method: "DELETE" });
		});
	});
});
