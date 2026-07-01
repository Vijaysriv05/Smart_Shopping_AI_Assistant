import { cn } from "@/lib/utils";

interface AiScoreBadgeProps {
  score?: number | null;
  className?: string;
}

export function AiScoreBadge({ score, className }: AiScoreBadgeProps) {
  if (score == null) return null;

  let colorClass = "bg-red-500/10 text-red-500 border-red-500/20";
  if (score >= 80) {
    colorClass = "bg-green-500/10 text-green-500 border-green-500/20";
  } else if (score >= 60) {
    colorClass = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  }

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full border backdrop-blur-sm",
        colorClass,
        className
      )}
    >
      AI Score {score}
    </div>
  );
}
