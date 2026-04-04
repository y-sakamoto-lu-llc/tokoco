"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_TAGS, useTagSuggest } from "@/hooks/useTagSuggest";
import { X } from "lucide-react";
import { useState } from "react";

type Tag = { id?: string; name: string };

type TagInputProps = {
	selectedTags: Tag[];
	onChange: (tags: Tag[]) => void;
};

export function TagInput({ selectedTags, onChange }: TagInputProps) {
	const [inputValue, setInputValue] = useState("");
	const { userTags } = useTagSuggest();

	const selectedNames = new Set(selectedTags.map((t) => t.name));

	// サジェスト: デフォルトタグ + ユーザータグ から未選択のものを表示
	const allSuggestions: Tag[] = [
		...DEFAULT_TAGS.filter((name) => !selectedNames.has(name)).map((name) => ({ name })),
		...userTags.filter((t) => !selectedNames.has(t.name)).map((t) => ({ id: t.id, name: t.name })),
	].filter((tag, idx, arr) => arr.findIndex((t) => t.name === tag.name) === idx);

	// 入力フィルタリング
	const filteredSuggestions = inputValue.trim()
		? allSuggestions.filter((t) => t.name.toLowerCase().includes(inputValue.toLowerCase()))
		: allSuggestions;

	function addTag(tag: Tag) {
		if (selectedNames.has(tag.name)) return;
		onChange([...selectedTags, tag]);
		setInputValue("");
	}

	function removeTag(name: string) {
		onChange(selectedTags.filter((t) => t.name !== name));
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" && inputValue.trim()) {
			e.preventDefault();
			addTag({ name: inputValue.trim() });
		}
	}

	return (
		<fieldset className="space-y-3 border-0 p-0 m-0">
			<legend className="sr-only">タグ入力</legend>

			{/* 選択済みタグ */}
			{selectedTags.length > 0 && (
				<div className="flex flex-wrap gap-1.5" aria-live="polite" aria-label="選択済みタグ">
					{selectedTags.map((tag) => (
						<Badge key={tag.name} variant="secondary" className="gap-1 pr-1">
							{tag.name}
							<button
								type="button"
								onClick={() => removeTag(tag.name)}
								className="rounded-full p-0.5 hover:bg-background/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[20px] min-w-[20px] flex items-center justify-center"
								aria-label={`${tag.name}を削除`}
							>
								<X size={10} aria-hidden="true" />
							</button>
						</Badge>
					))}
				</div>
			)}

			{/* タグ入力フィールド */}
			<Input
				type="text"
				placeholder="タグを入力して Enter で追加"
				value={inputValue}
				onChange={(e) => setInputValue(e.target.value)}
				onKeyDown={handleKeyDown}
				aria-label="タグ名を入力"
			/>

			{/* サジェスト */}
			{filteredSuggestions.length > 0 && (
				<div className="space-y-1.5">
					<p className="text-xs text-muted-foreground">よく使うタグ</p>
					<div className="flex flex-wrap gap-1.5">
						{filteredSuggestions.slice(0, 10).map((tag) => (
							<Button
								key={tag.name}
								type="button"
								variant="outline"
								size="sm"
								className="h-7 text-xs"
								onClick={() => addTag(tag)}
							>
								{tag.name}
							</Button>
						))}
					</div>
				</div>
			)}
		</fieldset>
	);
}
