"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { type PasswordResetRequestInput, passwordResetRequestSchema } from "@/lib/validations/auth";

export function PasswordResetRequestForm() {
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [serverError, setServerError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<PasswordResetRequestInput>({
		resolver: zodResolver(passwordResetRequestSchema),
	});

	const onSubmit = async (data: PasswordResetRequestInput) => {
		setServerError(null);
		setSuccessMessage(null);

		const res = await fetch("/api/auth/password-reset-request", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		// 成功・失敗にかかわらず同じメッセージを表示（列挙攻撃対策）
		if (res.ok) {
			setSuccessMessage(
				"パスワードリセット用のメールを送信しました。メール内のリンクをクリックしてください。"
			);
			return;
		}

		const json = await res.json().catch(() => ({}));
		setServerError(json.error ?? "送信中にエラーが発生しました");
	};

	if (successMessage) {
		return (
			<div
				role="alert"
				className="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm text-foreground"
			>
				{successMessage}
			</div>
		);
	}

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
				<label htmlFor="email" className="block text-sm font-medium">
					メールアドレス
				</label>
				<input
					id="email"
					type="email"
					autoComplete="email"
					className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring aria-invalid:border-destructive"
					aria-invalid={errors.email ? "true" : undefined}
					aria-describedby={errors.email ? "email-error" : undefined}
					{...register("email")}
				/>
				{errors.email && (
					<p id="email-error" className="text-xs text-destructive">
						{errors.email.message}
					</p>
				)}
			</div>

			<Button type="submit" className="w-full" disabled={isSubmitting}>
				{isSubmitting ? "送信中..." : "リセットメールを送信"}
			</Button>
		</form>
	);
}
