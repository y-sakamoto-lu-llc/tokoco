"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { type UpdateProfileInput, updateProfileSchema } from "@/lib/validations/auth";

type Props = {
	currentDisplayName: string;
};

export function ProfileForm({ currentDisplayName }: Props) {
	const [serverError, setServerError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<UpdateProfileInput>({
		resolver: zodResolver(updateProfileSchema),
		defaultValues: { displayName: currentDisplayName },
	});

	const onSubmit = async (data: UpdateProfileInput) => {
		setServerError(null);
		setSuccessMessage(null);

		const res = await fetch("/api/auth/profile", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (res.ok) {
			const json = await res.json();
			reset({ displayName: json.displayName });
			setSuccessMessage("表示名を更新しました");
			return;
		}

		const json = await res.json().catch(() => ({}));
		setServerError(json.error ?? "表示名の更新中にエラーが発生しました");
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

			<Button type="submit" disabled={isSubmitting}>
				{isSubmitting ? "更新中..." : "表示名を更新"}
			</Button>
		</form>
	);
}
