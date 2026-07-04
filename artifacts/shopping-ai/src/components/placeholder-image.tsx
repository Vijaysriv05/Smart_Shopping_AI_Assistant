import { cn } from "@/lib/utils";

interface PlaceholderImageProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function PlaceholderImage({ name, className, style }: PlaceholderImageProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center w-full h-full bg-ai-gradient text-white select-none",
        className
      )}
      style={style}
    >
      <span className="text-xl font-bold tracking-widest opacity-50">
        {getInitials(name)}
      </span>
    </div>
  );
}
