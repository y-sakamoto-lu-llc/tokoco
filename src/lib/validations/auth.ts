import { z } from "zod";

// パスワード共通バリデーション（AUTH-03）
// 8文字以上・英字を含む・数字を含む
const passwordSchema = z
	.string()
	.min(8, "パスワードは8文字以上で入力してください")
	.regex(/[a-zA-Z]/, "パスワードには英字を含めてください")
	.regex(/[0-9]/, "パスワードには数字を含めてください");

// 会員登録（AUTH-01〜04）
export const signupSchema = z.object({
	email: z
		.string()
		.min(1, "メールアドレスは必須です")
		.email("正しいメールアドレス形式で入力してください")
		.max(254, "メールアドレスが長すぎます"),
	password: passwordSchema,
	displayName: z
		.string()
		.trim()
		.min(1, "表示名は必須です")
		.max(50, "表示名は50文字以内で入力してください"),
});
export type SignupInput = z.infer<typeof signupSchema>;

// ログイン（AUTH-05）
export const loginSchema = z.object({
	email: z
		.string()
		.min(1, "メールアドレスは必須です")
		.email("正しいメールアドレス形式で入力してください"),
	password: z.string().min(1, "パスワードは必須です"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// パスワードリセット申請（AUTH-09）
export const passwordResetRequestSchema = z.object({
	email: z
		.string()
		.min(1, "メールアドレスは必須です")
		.email("正しいメールアドレス形式で入力してください"),
});
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

// パスワードリセット実行（AUTH-09・10）
// password と passwordConfirmation の一致をサーバー側でも検証する
export const passwordResetSchema = z
	.object({
		password: passwordSchema,
		passwordConfirmation: z.string(),
	})
	.refine((data) => data.password === data.passwordConfirmation, {
		message: "パスワードが一致しません",
		path: ["passwordConfirmation"],
	});
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

// 表示名変更（AUTH-11）
export const updateProfileSchema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "表示名は必須です")
		.max(50, "表示名は50文字以内で入力してください"),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// メールアドレス変更（AUTH-12）
export const updateEmailSchema = z.object({
	email: z
		.string()
		.min(1, "メールアドレスは必須です")
		.email("正しいメールアドレス形式で入力してください")
		.max(254, "メールアドレスが長すぎます"),
});
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;

// パスワード変更（AUTH-13）
// currentPassword / newPassword / newPasswordConfirmation の3フィールド
export const updatePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "現在のパスワードは必須です"),
		newPassword: passwordSchema,
		newPasswordConfirmation: z.string(),
	})
	.refine((data) => data.newPassword === data.newPasswordConfirmation, {
		message: "パスワードが一致しません",
		path: ["newPasswordConfirmation"],
	})
	.refine((data) => data.currentPassword !== data.newPassword, {
		message: "新しいパスワードは現在のパスワードと異なる必要があります",
		path: ["newPassword"],
	});
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
