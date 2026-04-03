"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { type UpdateEmailInput, updateEmailSchema } from "@/lib/validations/auth";

type Props = {
	currentEmail: string;
};

export function EmailForm({ currentEmail }: Props) {
	const [serverError, setServerError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<UpdateEmailInput>({
		resolver: zodResolver(updateEmailSchema),
		defaultValues: { email: "" },
	});

	const onSubmit = async (data: UpdateEmailInput) => {
		setServerError(null);
		setSuccessMessage(null);

		const res = await fetch("/api/auth/email", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (res.ok) {
			setSuccessMessage("確認メールを送信しました。新しいメールアドレスで確認してください");
			return;
		}

		const json = await res.json().catch(() => ({}));
		if (res.status === 409) {
			setServerError("このメールアドレスはすでに使用されています");
		} else {
			setServerError(json.error ?? "メールアドレスの更新中にエラーが発生しました");
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
				<label htmlFor="current-email" className="block text-sm font-medium text-muted-foreground">
					現在のメールアドレス
				</label>
				<p id="current-email" className="text-sm">
					{currentEmail}
				</p>
			</div>

			<div className="space-y-1">
				<label htmlFor="email" className="block text-sm font-medium">
					新しいメールアドレス
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

			<Button type="submit" disabled={isSubmitting}>
				{isSubmitting ? "送信中..." : "確認メールを送信"}
			</Button>
		</form>
	);
}
