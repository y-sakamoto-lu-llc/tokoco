import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

type TagBadgeProps = {
	tag: { id: string; name: string };
	onRemove?: (tagId: string) => void;
};

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
	return (
		<Badge variant="secondary" className="gap-1 pr-1">
			{tag.name}
			{onRemove && (
				<button
					type="button"
					onClick={() => onRemove(tag.id)}
					className="rounded-full p-0.5 hover:bg-background/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[20px] min-w-[20px] flex items-center justify-center"
					aria-label={`${tag.name}を削除`}
				>
					<X size={10} aria-hidden="true" />
				</button>
			)}
		</Badge>
	);
}
