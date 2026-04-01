"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function DeleteAccountSection() {
	const router = useRouter();
	const [showConfirm, setShowConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);

	const handleDelete = async () => {
		setIsDeleting(true);
		setServerError(null);

		const res = await fetch("/api/auth/account", {
			method: "DELETE",
		});

		if (res.ok || res.status === 204) {
			router.refresh();
			router.push("/login");
			return;
		}

		setIsDeleting(false);
		const json = await res.json().catch(() => ({}));
		setServerError(json.error ?? "アカウントの削除中にエラーが発生しました");
	};

	return (
		<div className="space-y-4">
			{serverError && (
				<div
					role="alert"
					className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				>
					{serverError}
				</div>
			)}

			{!showConfirm ? (
				<Button variant="destructive" onClick={() => setShowConfirm(true)}>
					アカウントを削除
				</Button>
			) : (
				<div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 space-y-4">
					<p className="text-sm font-medium text-destructive">本当にアカウントを削除しますか？</p>
					<p className="text-sm text-muted-foreground">
						この操作は取り消せません。登録した店舗・タグ・イベントのデータはすべて削除されます。
					</p>
					<div className="flex gap-3">
						<Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
							{isDeleting ? "削除中..." : "削除する"}
						</Button>
						<Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isDeleting}>
							キャンセル
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
