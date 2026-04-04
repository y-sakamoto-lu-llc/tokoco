import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ShopCardSkeleton() {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					<Skeleton className="h-16 w-16 rounded-md flex-shrink-0" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-16 rounded-sm" />
						<Skeleton className="h-5 w-3/4" />
						<Skeleton className="h-4 w-1/2" />
					</div>
				</div>
				<div className="flex gap-1.5 mt-3">
					<Skeleton className="h-5 w-14 rounded-sm" />
					<Skeleton className="h-5 w-14 rounded-sm" />
				</div>
			</CardContent>
		</Card>
	);
}
