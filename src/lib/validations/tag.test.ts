import { describe, expect, it } from "vitest";
import { attachTagSchema, createTagSchema } from "./tag";

// ---------------------------------------------------------------------------
// createTagSchema
// ---------------------------------------------------------------------------
describe("createTagSchema", () => {
	it("有効なタグ名を受け入れる", () => {
		const result = createTagSchema.safeParse({ name: "ランチ" });
		expect(result.success).toBe(true);
	});

	it("name が空文字の場合はエラー", () => {
		const result = createTagSchema.safeParse({ name: "" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "name");
			expect(err?.message).toBe("タグ名は必須です");
		}
	});

	it("name が 30 文字を超える場合はエラー", () => {
		const result = createTagSchema.safeParse({ name: "あ".repeat(31) });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "name");
			expect(err?.message).toBe("タグ名は30文字以内で入力してください");
		}
	});

	it("name がちょうど30文字の場合は受け入れる", () => {
		const result = createTagSchema.safeParse({ name: "あ".repeat(30) });
		expect(result.success).toBe(true);
	});

	it("name が1文字の場合は受け入れる", () => {
		const result = createTagSchema.safeParse({ name: "A" });
		expect(result.success).toBe(true);
	});

	it("name の前後の空白が trim される", () => {
		const result = createTagSchema.safeParse({ name: "  ランチ  " });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("ランチ");
		}
	});
});

// ---------------------------------------------------------------------------
// attachTagSchema
// ---------------------------------------------------------------------------
describe("attachTagSchema", () => {
	it("有効な UUID の tagId を受け入れる", () => {
		const result = attachTagSchema.safeParse({
			tagId: "550e8400-e29b-41d4-a716-446655440000",
		});
		expect(result.success).toBe(true);
	});

	it("tagId が UUID でない場合はエラー", () => {
		const result = attachTagSchema.safeParse({ tagId: "not-a-uuid" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "tagId");
			expect(err?.message).toBe("tagId は UUID 形式で指定してください");
		}
	});

	it("tagId が空文字の場合はエラー", () => {
		const result = attachTagSchema.safeParse({ tagId: "" });
		expect(result.success).toBe(false);
	});
});
