"use client";

import type { PlaceCandidate } from "@/app/api/shops/places/search/route";
import { useCallback, useEffect, useRef, useState } from "react";

type UsePlacesSearchResult = {
	candidates: PlaceCandidate[];
	isLoading: boolean;
	error: string | null;
	search: (query: string) => void;
	clear: () => void;
};

const DEBOUNCE_MS = 300;

export function usePlacesSearch(): UsePlacesSearchResult {
	const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const clear = useCallback(() => {
		setCandidates([]);
		setError(null);
		setIsLoading(false);
	}, []);

	const search = useCallback((query: string) => {
		if (timerRef.current) clearTimeout(timerRef.current);
		if (!query.trim()) {
			setCandidates([]);
			setError(null);
			return;
		}

		timerRef.current = setTimeout(async () => {
			if (abortRef.current) abortRef.current.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			setIsLoading(true);
			setError(null);
			try {
				const res = await fetch(`/api/shops/places/search?q=${encodeURIComponent(query)}`, {
					signal: controller.signal,
				});
				if (!res.ok) {
					const data = (await res.json()) as { error?: string };
					setError(data.error ?? "検索に失敗しました");
					setCandidates([]);
					return;
				}
				const data = (await res.json()) as PlaceCandidate[];
				setCandidates(data);
				if (data.length === 0) {
					setError("候補が見つかりませんでした");
				}
			} catch (err) {
				if ((err as Error).name !== "AbortError") {
					setError("通信エラーが発生しました");
					setCandidates([]);
				}
			} finally {
				setIsLoading(false);
			}
		}, DEBOUNCE_MS);
	}, []);

	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
			if (abortRef.current) abortRef.current.abort();
		};
	}, []);

	return { candidates, isLoading, error, search, clear };
}
