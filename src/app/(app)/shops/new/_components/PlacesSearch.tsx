"use client";

import type { PlaceCandidate } from "@/app/api/shops/places/search/route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlacesSearch } from "@/hooks/usePlacesSearch";
import { Loader2, MapPin, Search, Star } from "lucide-react";
import { useRef, useState } from "react";

type PlacesSearchProps = {
	onSelect: (candidate: PlaceCandidate) => void;
	onManualMode: () => void;
};

export function PlacesSearch({ onSelect, onManualMode }: PlacesSearchProps) {
	const [query, setQuery] = useState("");
	const [showCandidates, setShowCandidates] = useState(false);
	const { candidates, isLoading, error, search, clear } = usePlacesSearch();
	const inputRef = useRef<HTMLInputElement>(null);

	function handleSearch() {
		if (!query.trim()) return;
		setShowCandidates(true);
		search(query);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter") {
			e.preventDefault();
			handleSearch();
		}
	}

	function handleSelect(candidate: PlaceCandidate) {
		setShowCandidates(false);
		clear();
		onSelect(candidate);
	}

	return (
		<div className="space-y-3">
			<div className="flex gap-2">
				<div className="relative flex-1">
					<Input
						ref={inputRef}
						type="text"
						placeholder="店舗名を入力して検索（例：新宿 焼肉）"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleKeyDown}
						autoFocus
						aria-label="店舗名を入力して検索"
						className="pr-10"
					/>
				</div>
				<Button
					type="button"
					onClick={handleSearch}
					disabled={isLoading || !query.trim()}
					aria-label="検索"
				>
					{isLoading ? (
						<Loader2 size={16} className="animate-spin" aria-hidden="true" />
					) : (
						<Search size={16} aria-hidden="true" />
					)}
					<span className="hidden sm:inline">検索</span>
				</Button>
			</div>

			{/* 候補リスト */}
			{showCandidates && (
				<div className="border rounded-md shadow-sm bg-background" aria-label="店舗候補">
					{isLoading && (
						<div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
							<Loader2 size={16} className="animate-spin mr-2" aria-hidden="true" />
							検索中...
						</div>
					)}

					{!isLoading && error && (
						<div className="py-4 px-4 space-y-3">
							<p className="text-sm text-muted-foreground">{error}</p>
							<Button type="button" variant="outline" size="sm" onClick={onManualMode}>
								手動で入力する
							</Button>
						</div>
					)}

					{!isLoading && !error && candidates.length > 0 && (
						<ul className="divide-y">
							{candidates.map((candidate) => (
								<li key={candidate.placeId}>
									<button
										type="button"
										className="w-full text-left px-4 py-3 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:bg-muted min-h-[44px]"
										onClick={() => handleSelect(candidate)}
									>
										<div className="font-medium text-sm">{candidate.name}</div>
										{candidate.address && (
											<div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
												<MapPin size={10} aria-hidden="true" />
												{candidate.address}
											</div>
										)}
										<div className="flex gap-3 mt-1">
											{candidate.rating != null && (
												<span className="text-xs text-muted-foreground flex items-center gap-0.5">
													<Star
														size={10}
														className="text-yellow-500 fill-yellow-500"
														aria-hidden="true"
													/>
													{candidate.rating.toFixed(1)}
												</span>
											)}
											{candidate.priceRange && (
												<span className="text-xs text-muted-foreground">
													{candidate.priceRange}
												</span>
											)}
										</div>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			)}

			{/* 手動入力リンク */}
			<div className="text-center">
				<button
					type="button"
					className="text-sm text-muted-foreground underline-offset-4 hover:underline"
					onClick={onManualMode}
				>
					候補が見つからない場合は手動で入力する
				</button>
			</div>
		</div>
	);
}
