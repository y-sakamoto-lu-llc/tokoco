import { z } from "zod";

// タグ作成（SHOP-07）
export const createTagSchema = z.object({
	name: z
		.string()
		.min(1, "タグ名は必須です")
		.max(30, "タグ名は30文字以内で入力してください")
		.trim(),
});
export type CreateTagInput = z.infer<typeof createTagSchema>;

// 店舗へのタグ付与（SHOP-09）
export const attachTagSchema = z.object({
	tagId: z.string().uuid("tagId は UUID 形式で指定してください"),
});
export type AttachTagInput = z.infer<typeof attachTagSchema>;
