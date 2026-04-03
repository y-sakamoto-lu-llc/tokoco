"use client";

import { useEffect, useState } from "react";

type TagItem = {
	id: string;
	name: string;
};

const DEFAULT_TAGS = ["行きたい", "スタメン入り", "行った"];

type UseTagSuggestResult = {
	userTags: TagItem[];
	isLoading: boolean;
};

export function useTagSuggest(): UseTagSuggestResult {
	const [userTags, setUserTags] = useState<TagItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		setIsLoading(true);
		fetch("/api/tags")
			.then((res) => (res.ok ? (res.json() as Promise<TagItem[]>) : Promise.resolve([])))
			.then((tags) => setUserTags(tags))
			.catch(() => setUserTags([]))
			.finally(() => setIsLoading(false));
	}, []);

	return { userTags, isLoading };
}

export { DEFAULT_TAGS };
