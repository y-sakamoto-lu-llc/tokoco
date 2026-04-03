type AddressComponent = {
	longText: string;
	types: string[];
};

export function extractArea(components: AddressComponent[]): string | null {
	const prefecture = components.find((c) =>
		c.types.includes("administrative_area_level_1")
	)?.longText;
	const city = components.find((c) => c.types.includes("locality"))?.longText;
	if (!prefecture) return null;
	return city ? `${prefecture}${city}` : prefecture;
}

export function convertBusinessHours(weekdayDescriptions: string[] | undefined): string | null {
	if (!weekdayDescriptions?.length) return null;
	return weekdayDescriptions.join("\n");
}
