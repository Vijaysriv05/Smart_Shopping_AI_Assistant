import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  originalPrice?: number | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PriceDisplay({ price, originalPrice, className, size = "md" }: PriceDisplayProps) {
  const displayPrice = price / 100;
  const displayOriginal = originalPrice != null ? originalPrice / 100 : null;
  const hasDiscount = displayOriginal != null && displayOriginal > displayPrice;
  const discountPercent = hasDiscount
    ? Math.round(((displayOriginal - displayPrice) / displayOriginal) * 100)
    : 0;

  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl"
  };

  const originalSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-lg"
  };

  return (
    <div className={cn("flex items-end gap-2", className)}>
      <span className={cn("font-bold text-foreground", sizeClasses[size])}>
        ${displayPrice.toFixed(2)}
      </span>
      {hasDiscount && (
        <>
          <span className={cn("line-through text-muted-foreground", originalSizeClasses[size])}>
            ${displayOriginal!.toFixed(2)}
          </span>
          <span className="text-xs font-semibold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
            -{discountPercent}%
          </span>
        </>
      )}
    </div>
  );
}
