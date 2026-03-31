"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { type PasswordResetInput, passwordResetSchema } from "@/lib/validations/auth";

export function NewPasswordForm() {
	const router = useRouter();
	const [serverError, setServerError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<PasswordResetInput>({
		resolver: zodResolver(passwordResetSchema),
	});

	const onSubmit = async (data: PasswordResetInput) => {
		setServerError(null);

		const res = await fetch("/api/auth/password-reset", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (res.ok) {
			router.push("/login");
			return;
		}

		const json = await res.json().catch(() => ({}));
		if (res.status === 401) {
			setServerError(
				"リセットリンクが無効または期限切れです。再度申請してください"
			);
		} else {
			setServerError(json.error ?? "パスワードの変更中にエラーが発生しました");
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
			{serverError && (
				<div
					role="alert"
					className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				>
					{serverError}
				</div>
			)}

			<div className="space-y-1">
				<label htmlFor="password" className="block text-sm font-medium">
					新しいパスワード
				</label>
				<input
					id="password"
					type="password"
					autoComplete="new-password"
					className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring aria-invalid:border-destructive"
					aria-invalid={errors.password ? "true" : undefined}
					aria-describedby={errors.password ? "password-error" : undefined}
					{...register("password")}
				/>
				<p className="text-xs text-muted-foreground">8文字以上、英字と数字を含めてください</p>
				{errors.password && (
					<p id="password-error" className="text-xs text-destructive">
						{errors.password.message}
					</p>
				)}
			</div>

			<div className="space-y-1">
				<label htmlFor="passwordConfirmation" className="block text-sm font-medium">
					新しいパスワード（確認）
				</label>
				<input
					id="passwordConfirmation"
					type="password"
					autoComplete="new-password"
					className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring aria-invalid:border-destructive"
					aria-invalid={errors.passwordConfirmation ? "true" : undefined}
					aria-describedby={errors.passwordConfirmation ? "passwordConfirmation-error" : undefined}
					{...register("passwordConfirmation")}
				/>
				{errors.passwordConfirmation && (
					<p id="passwordConfirmation-error" className="text-xs text-destructive">
						{errors.passwordConfirmation.message}
					</p>
				)}
			</div>

			<Button type="submit" className="w-full" disabled={isSubmitting}>
				{isSubmitting ? "変更中..." : "パスワードを変更"}
			</Button>
		</form>
	);
}
