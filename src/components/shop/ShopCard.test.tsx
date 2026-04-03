import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShopCard } from "./ShopCard";

// next/image は Edge 環境での動作を考慮してモック
vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// biome-ignore lint/a11y/useAltText: test mock
		<img src={src} alt={alt} />
	),
}));

const BASE_SHOP = {
	id: "shop-1",
	name: "テスト焼肉",
	area: "渋谷",
	category: "焼肉",
	priceRange: "¥3,000〜¥5,999",
	externalRating: 4.2,
	photoUrl: null,
	tags: [
		{ id: "tag-1", name: "スタメン入り" },
		{ id: "tag-2", name: "行った" },
	],
};

describe("ShopCard", () => {
	it("店名・カテゴリ・価格帯・タグが表示される", () => {
		render(<ShopCard shop={BASE_SHOP} />);
		expect(screen.getByText("テスト焼肉")).toBeInTheDocument();
		expect(screen.getByText("焼肉")).toBeInTheDocument();
		expect(screen.getByText("¥3,000〜¥5,999")).toBeInTheDocument();
		expect(screen.getByText("スタメン入り")).toBeInTheDocument();
		expect(screen.getByText("行った")).toBeInTheDocument();
	});

	it("評価が表示される", () => {
		render(<ShopCard shop={BASE_SHOP} />);
		expect(screen.getByText("4.2")).toBeInTheDocument();
	});

	it("エリアが表示される", () => {
		render(<ShopCard shop={BASE_SHOP} />);
		expect(screen.getByText("渋谷")).toBeInTheDocument();
	});

	it("photoUrlがnullの場合に写真なしテキストが表示される", () => {
		render(<ShopCard shop={{ ...BASE_SHOP, photoUrl: null }} />);
		expect(screen.getByText("写真なし")).toBeInTheDocument();
	});

	it("タグが4件以上の場合は3件表示して残りを +N で表示する", () => {
		const shop = {
			...BASE_SHOP,
			tags: [
				{ id: "tag-1", name: "タグ1" },
				{ id: "tag-2", name: "タグ2" },
				{ id: "tag-3", name: "タグ3" },
				{ id: "tag-4", name: "タグ4" },
			],
		};
		render(<ShopCard shop={shop} />);
		expect(screen.getByText("タグ1")).toBeInTheDocument();
		expect(screen.getByText("タグ2")).toBeInTheDocument();
		expect(screen.getByText("タグ3")).toBeInTheDocument();
		expect(screen.queryByText("タグ4")).not.toBeInTheDocument();
		expect(screen.getByText("+1")).toBeInTheDocument();
	});

	it("店舗詳細ページへのリンクが設定されている", () => {
		render(<ShopCard shop={BASE_SHOP} />);
		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/shops/shop-1");
	});

	it("カテゴリがnullの場合はカテゴリバッジが表示されない", () => {
		render(<ShopCard shop={{ ...BASE_SHOP, category: null }} />);
		expect(screen.queryByText("焼肉")).not.toBeInTheDocument();
	});
});
