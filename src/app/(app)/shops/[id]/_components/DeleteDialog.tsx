"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type DeleteDialogProps = {
	shopId: string;
	shopName: string;
};

export function DeleteDialog({ shopId, shopName }: DeleteDialogProps) {
	const [open, setOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const router = useRouter();

	async function handleDelete() {
		setIsDeleting(true);
		try {
			const res = await fetch(`/api/shops/${shopId}`, {
				method: "DELETE",
			});
			if (res.ok || res.status === 204) {
				toast.success("店舗を削除しました");
				router.push("/home");
			} else {
				const data = (await res.json()) as { error?: string };
				toast.error(data.error ?? "削除に失敗しました");
				setIsDeleting(false);
				setOpen(false);
			}
		} catch {
			toast.error("通信エラーが発生しました");
			setIsDeleting(false);
			setOpen(false);
		}
	}

	return (
		<>
			<Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
				<Trash2 size={14} aria-hidden="true" />
				削除
			</Button>

			<ConfirmDialog
				open={open}
				onOpenChange={setOpen}
				title="店舗を削除しますか？"
				description={`「${shopName}」を削除します。この操作は取り消せません。`}
				confirmLabel="削除する"
				destructive
				onConfirm={handleDelete}
				isLoading={isDeleting}
			/>
		</>
	);
}
