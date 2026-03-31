"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { type SignupInput, signupSchema } from "@/lib/validations/auth";

export function SignupForm() {
	const router = useRouter();
	const [serverError, setServerError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<SignupInput>({
		resolver: zodResolver(signupSchema),
	});

	const onSubmit = async (data: SignupInput) => {
		setServerError(null);

		const res = await fetch("/api/auth/signup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (res.ok) {
			router.push("/verify-email");
			return;
		}

		const json = await res.json().catch(() => ({}));
		if (res.status === 409) {
			setServerError("このメールアドレスはすでに使用されています");
		} else {
			setServerError(json.error ?? "登録処理中にエラーが発生しました");
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

			<div className="space-y-1">
				<label htmlFor="password" className="block text-sm font-medium">
					パスワード
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
				<label htmlFor="displayName" className="block text-sm font-medium">
					表示名
				</label>
				<input
					id="displayName"
					type="text"
					autoComplete="nickname"
					className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring aria-invalid:border-destructive"
					aria-invalid={errors.displayName ? "true" : undefined}
					aria-describedby={errors.displayName ? "displayName-error" : undefined}
					{...register("displayName")}
				/>
				{errors.displayName && (
					<p id="displayName-error" className="text-xs text-destructive">
						{errors.displayName.message}
					</p>
				)}
			</div>

			<Button type="submit" className="w-full" disabled={isSubmitting}>
				{isSubmitting ? "登録中..." : "登録する"}
			</Button>
		</form>
	);
}
