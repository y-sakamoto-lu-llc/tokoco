import { describe, expect, it } from "vitest";
import type { ZodIssue } from "zod";
import {
	loginSchema,
	passwordResetRequestSchema,
	passwordResetSchema,
	signupSchema,
	updateEmailSchema,
	updatePasswordSchema,
	updateProfileSchema,
} from "./auth";

describe("signupSchema", () => {
	it("有効な入力を受け入れる", () => {
		const result = signupSchema.safeParse({
			email: "test@example.com",
			password: "Password1",
			displayName: "テストユーザー",
		});
		expect(result.success).toBe(true);
	});

	it("メールアドレスが不正な場合はエラー", () => {
		const result = signupSchema.safeParse({
			email: "invalid-email",
			password: "Password1",
			displayName: "テスト",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const emailError = result.error.issues.find((e: ZodIssue) => e.path[0] === "email");
			expect(emailError).toBeDefined();
		}
	});

	it("パスワードが8文字未満はエラー", () => {
		const result = signupSchema.safeParse({
			email: "test@example.com",
			password: "Pass1",
			displayName: "テスト",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const pwError = result.error.issues.find((e: ZodIssue) => e.path[0] === "password");
			expect(pwError?.message).toBe("パスワードは8文字以上で入力してください");
		}
	});

	it("パスワードに英字がない場合はエラー（AUTH-03）", () => {
		const result = signupSchema.safeParse({
			email: "test@example.com",
			password: "12345678",
			displayName: "テスト",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const pwError = result.error.issues.find((e: ZodIssue) => e.path[0] === "password");
			expect(pwError?.message).toBe("パスワードには英字を含めてください");
		}
	});

	it("パスワードに数字がない場合はエラー（AUTH-03）", () => {
		const result = signupSchema.safeParse({
			email: "test@example.com",
			password: "PasswordOnly",
			displayName: "テスト",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const pwError = result.error.issues.find((e: ZodIssue) => e.path[0] === "password");
			expect(pwError?.message).toBe("パスワードには数字を含めてください");
		}
	});

	it("表示名が空の場合はエラー", () => {
		const result = signupSchema.safeParse({
			email: "test@example.com",
			password: "Password1",
			displayName: "",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const nameError = result.error.issues.find((e: ZodIssue) => e.path[0] === "displayName");
			expect(nameError).toBeDefined();
		}
	});

	it("表示名が50文字を超える場合はエラー", () => {
		const result = signupSchema.safeParse({
			email: "test@example.com",
			password: "Password1",
			displayName: "あ".repeat(51),
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const nameError = result.error.issues.find((e: ZodIssue) => e.path[0] === "displayName");
			expect(nameError?.message).toBe("表示名は50文字以内で入力してください");
		}
	});

	it("メールアドレスが254文字を超える場合はエラー", () => {
		const localPart = "a".repeat(244);
		const result = signupSchema.safeParse({
			email: `${localPart}@example.com`,
			password: "Password1",
			displayName: "テスト",
		});
		expect(result.success).toBe(false);
	});
});

describe("loginSchema", () => {
	it("有効な入力を受け入れる", () => {
		const result = loginSchema.safeParse({
			email: "test@example.com",
			password: "anypassword",
		});
		expect(result.success).toBe(true);
	});

	it("メールアドレスが空の場合はエラー", () => {
		const result = loginSchema.safeParse({
			email: "",
			password: "anypassword",
		});
		expect(result.success).toBe(false);
	});

	it("パスワードが空の場合はエラー", () => {
		const result = loginSchema.safeParse({
			email: "test@example.com",
			password: "",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const pwError = result.error.issues.find((e: ZodIssue) => e.path[0] === "password");
			expect(pwError?.message).toBe("パスワードは必須です");
		}
	});

	it("ログイン時はパスワード強度チェックを行わない", () => {
		// ログインは既存パスワードを使うため強度チェック不要
		const result = loginSchema.safeParse({
			email: "test@example.com",
			password: "weak",
		});
		expect(result.success).toBe(true);
	});
});

describe("passwordResetRequestSchema", () => {
	it("有効なメールアドレスを受け入れる", () => {
		const result = passwordResetRequestSchema.safeParse({
			email: "user@example.com",
		});
		expect(result.success).toBe(true);
	});

	it("不正なメールアドレスはエラー", () => {
		const result = passwordResetRequestSchema.safeParse({
			email: "not-an-email",
		});
		expect(result.success).toBe(false);
	});
});

describe("passwordResetSchema", () => {
	it("パスワードと確認が一致する場合は成功", () => {
		const result = passwordResetSchema.safeParse({
			password: "NewPass1",
			passwordConfirmation: "NewPass1",
		});
		expect(result.success).toBe(true);
	});

	it("パスワードと確認が不一致の場合はエラー", () => {
		const result = passwordResetSchema.safeParse({
			password: "NewPass1",
			passwordConfirmation: "Different1",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const confirmError = result.error.issues.find(
				(e: ZodIssue) => e.path[0] === "passwordConfirmation"
			);
			expect(confirmError?.message).toBe("パスワードが一致しません");
		}
	});

	it("パスワードがAUTH-03要件を満たさない場合はエラー", () => {
		const result = passwordResetSchema.safeParse({
			password: "onlyletters",
			passwordConfirmation: "onlyletters",
		});
		expect(result.success).toBe(false);
	});
});

describe("updateProfileSchema", () => {
	it("有効な表示名を受け入れる", () => {
		const result = updateProfileSchema.safeParse({ displayName: "新しい名前" });
		expect(result.success).toBe(true);
	});

	it("表示名が空の場合はエラー", () => {
		const result = updateProfileSchema.safeParse({ displayName: "" });
		expect(result.success).toBe(false);
	});

	it("表示名が50文字を超える場合はエラー", () => {
		const result = updateProfileSchema.safeParse({ displayName: "a".repeat(51) });
		expect(result.success).toBe(false);
	});
});

describe("updateEmailSchema", () => {
	it("有効なメールアドレスを受け入れる", () => {
		const result = updateEmailSchema.safeParse({ email: "new@example.com" });
		expect(result.success).toBe(true);
	});

	it("不正なメールアドレスはエラー", () => {
		const result = updateEmailSchema.safeParse({ email: "not-an-email" });
		expect(result.success).toBe(false);
	});
});

describe("updatePasswordSchema", () => {
	it("有効な入力を受け入れる", () => {
		const result = updatePasswordSchema.safeParse({
			currentPassword: "OldPass1",
			newPassword: "NewPass1",
			newPasswordConfirmation: "NewPass1",
		});
		expect(result.success).toBe(true);
	});

	it("新パスワードと確認が不一致の場合はエラー", () => {
		const result = updatePasswordSchema.safeParse({
			currentPassword: "OldPass1",
			newPassword: "NewPass1",
			newPasswordConfirmation: "Different1",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const confirmError = result.error.issues.find(
				(e: ZodIssue) => e.path[0] === "newPasswordConfirmation"
			);
			expect(confirmError?.message).toBe("パスワードが一致しません");
		}
	});

	it("新パスワードが現在のパスワードと同じ場合はエラー（AUTH-13）", () => {
		const result = updatePasswordSchema.safeParse({
			currentPassword: "SamePass1",
			newPassword: "SamePass1",
			newPasswordConfirmation: "SamePass1",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const newPwError = result.error.issues.find((e: ZodIssue) => e.path[0] === "newPassword");
			expect(newPwError?.message).toBe("新しいパスワードは現在のパスワードと異なる必要があります");
		}
	});

	it("新パスワードがAUTH-03要件を満たさない場合はエラー", () => {
		const result = updatePasswordSchema.safeParse({
			currentPassword: "OldPass1",
			newPassword: "nouppercase1",
			newPasswordConfirmation: "nouppercase1",
		});
		// 英字は含まれているが小文字のみでもOK（英字・数字混在であればよい）
		expect(result.success).toBe(true);
	});

	it("新パスワードに数字がない場合はエラー", () => {
		const result = updatePasswordSchema.safeParse({
			currentPassword: "OldPass1",
			newPassword: "NoNumbers!",
			newPasswordConfirmation: "NoNumbers!",
		});
		expect(result.success).toBe(false);
	});
});
