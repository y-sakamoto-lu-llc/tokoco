"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { type UpdatePasswordInput, updatePasswordSchema } from "@/lib/validations/auth";

export function PasswordForm() {
	const [serverError, setServerError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<UpdatePasswordInput>({
		resolver: zodResolver(updatePasswordSchema),
		defaultValues: { currentPassword: "", newPassword: "", newPasswordConfirmation: "" },
	});

	const onSubmit = async (data: UpdatePasswordInput) => {
		setServerError(null);
		setSuccessMessage(null);

		const res = await fetch("/api/auth/password", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (res.ok) {
			reset();
			setSuccessMessage("パスワードを変更しました");
			return;
		}

		const json = await res.json().catch(() => ({}));
		if (res.status === 400 && json.error === "現在のパスワードが正しくありません") {
			setServerError("現在のパスワードが正しくありません");
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
			{successMessage && (
				<div
					role="status"
					className="rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400"
				>
					{successMessage}
				</div>
			)}

			<div className="space-y-1">
				<label htmlFor="currentPassword" className="block text-sm font-medium">
					現在のパスワード
				</label>
				<input
					id="currentPassword"
					type="password"
					autoComplete="current-password"
					className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring aria-invalid:border-destructive"
					aria-invalid={errors.currentPassword ? "true" : undefined}
					aria-describedby={errors.currentPassword ? "currentPassword-error" : undefined}
					{...register("currentPassword")}
				/>
				{errors.currentPassword && (
					<p id="currentPassword-error" className="text-xs text-destructive">
						{errors.currentPassword.message}
					</p>
				)}
			</div>

			<div className="space-y-1">
				<label htmlFor="newPassword" className="block text-sm font-medium">
					新しいパスワード
				</label>
				<input
					id="newPassword"
					type="password"
					autoComplete="new-password"
					className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring aria-invalid:border-destructive"
					aria-invalid={errors.newPassword ? "true" : undefined}
					aria-describedby={errors.newPassword ? "newPassword-error" : undefined}
					{...register("newPassword")}
				/>
				<p className="text-xs text-muted-foreground">8文字以上、英字と数字を含めてください</p>
				{errors.newPassword && (
					<p id="newPassword-error" className="text-xs text-destructive">
						{errors.newPassword.message}
					</p>
				)}
			</div>

			<div className="space-y-1">
				<label htmlFor="newPasswordConfirmation" className="block text-sm font-medium">
					新しいパスワード（確認）
				</label>
				<input
					id="newPasswordConfirmation"
					type="password"
					autoComplete="new-password"
					className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring aria-invalid:border-destructive"
					aria-invalid={errors.newPasswordConfirmation ? "true" : undefined}
					aria-describedby={
						errors.newPasswordConfirmation ? "newPasswordConfirmation-error" : undefined
					}
					{...register("newPasswordConfirmation")}
				/>
				{errors.newPasswordConfirmation && (
					<p id="newPasswordConfirmation-error" className="text-xs text-destructive">
						{errors.newPasswordConfirmation.message}
					</p>
				)}
			</div>

			<Button type="submit" disabled={isSubmitting}>
				{isSubmitting ? "変更中..." : "パスワードを変更"}
			</Button>
		</form>
	);
}
