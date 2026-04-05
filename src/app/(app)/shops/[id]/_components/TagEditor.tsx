"use client";

import { TagBadge } from "@/components/shop/TagBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DEFAULT_TAGS = ["行きたい", "スタメン入り", "行った"];

type Tag = { id: string; name: string };

type TagEditorProps = {
	shopId: string;
	initialTags: Tag[];
};

export function TagEditor({ shopId, initialTags }: TagEditorProps) {
	const [tags, setTags] = useState<Tag[]>(initialTags);
	const [inputValue, setInputValue] = useState("");
	const [userTags, setUserTags] = useState<Tag[]>([]);
	const [isAdding, setIsAdding] = useState(false);
	const [isRemoving, setIsRemoving] = useState<string | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: tags の変更後にユーザータグを再取得する
	useEffect(() => {
		fetch("/api/tags")
			.then((res) => (res.ok ? (res.json() as Promise<Tag[]>) : Promise.resolve([])))
			.then(setUserTags)
			.catch(() => setUserTags([]));
	}, [tags]);

	const taggedIds = new Set(tags.map((t) => t.id));

	// サジェスト: デフォルトタグ + ユーザータグ（未選択のもの）
	const suggestions = [
		...DEFAULT_TAGS.filter((name) => !tags.some((t) => t.name === name)),
		...userTags
			.filter((t) => !taggedIds.has(t.id) && !DEFAULT_TAGS.includes(t.name))
			.map((t) => t.name),
	].filter((name, idx, arr) => arr.indexOf(name) === idx);

	async function addTagByName(name: string) {
		if (!name.trim()) return;
		if (tags.some((t) => t.name === name.trim())) return;

		setIsAdding(true);
		try {
			// まずタグを作成または取得
			let tagId: string;
			const createRes = await fetch("/api/tags", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: name.trim() }),
			});

			if (createRes.status === 409) {
				// 既存タグ: レスポンスボディの existingId を使用する
				const conflictBody = (await createRes.json()) as { existingId?: string };
				if (conflictBody.existingId) {
					tagId = conflictBody.existingId;
				} else {
					toast.error("タグが見つかりませんでした");
					return;
				}
			} else if (createRes.ok) {
				const created = (await createRes.json()) as Tag;
				tagId = created.id;
			} else {
				toast.error("タグの作成に失敗しました");
				return;
			}

			// 店舗にタグを紐付け
			const attachRes = await fetch(`/api/shops/${shopId}/tags`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tagId }),
			});

			if (attachRes.ok) {
				const newTag: Tag = { id: tagId, name: name.trim() };
				setTags((prev) => [...prev, newTag]);
				setInputValue("");
			} else if (attachRes.status === 409) {
				toast.error("このタグは既に追加されています");
			} else {
				toast.error("タグの追加に失敗しました");
			}
		} catch {
			toast.error("通信エラーが発生しました");
		} finally {
			setIsAdding(false);
		}
	}

	async function removeTag(tagId: string) {
		setIsRemoving(tagId);
		try {
			const res = await fetch(`/api/shops/${shopId}/tags/${tagId}`, {
				method: "DELETE",
			});
			if (res.ok || res.status === 204) {
				setTags((prev) => prev.filter((t) => t.id !== tagId));
			} else {
				toast.error("タグの削除に失敗しました");
			}
		} catch {
			toast.error("通信エラーが発生しました");
		} finally {
			setIsRemoving(null);
		}
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter") {
			e.preventDefault();
			addTagByName(inputValue);
		}
	}

	return (
		<div className="space-y-3" aria-label="タグ編集">
			{/* 付与済みタグ */}
			<div
				className="flex flex-wrap gap-1.5 min-h-[28px]"
				aria-live="polite"
				aria-label="付与済みタグ"
			>
				{tags.length === 0 && <span className="text-sm text-muted-foreground">タグなし</span>}
				{tags.map((tag) => (
					<div key={tag.id} className="relative">
						{isRemoving === tag.id ? (
							<div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
								<Loader2 size={10} className="animate-spin" aria-hidden="true" />
								{tag.name}
							</div>
						) : (
							<TagBadge tag={tag} onRemove={removeTag} />
						)}
					</div>
				))}
			</div>

			{/* タグ追加入力 */}
			<div className="flex gap-2">
				<Input
					type="text"
					placeholder="タグ名を入力"
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					onKeyDown={handleKeyDown}
					aria-label="タグ名を入力"
					className="flex-1"
				/>
				<Button
					type="button"
					size="sm"
					onClick={() => addTagByName(inputValue)}
					disabled={isAdding || !inputValue.trim()}
					aria-label="タグを追加"
				>
					{isAdding ? (
						<Loader2 size={14} className="animate-spin" aria-hidden="true" />
					) : (
						<Plus size={14} aria-hidden="true" />
					)}
				</Button>
			</div>

			{/* サジェスト */}
			{suggestions.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{suggestions.slice(0, 8).map((name) => (
						<Button
							key={name}
							type="button"
							variant="outline"
							size="sm"
							className="h-7 text-xs"
							onClick={() => addTagByName(name)}
							disabled={isAdding}
						>
							{name}
						</Button>
					))}
				</div>
			)}
		</div>
	);
}
