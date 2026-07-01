import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  originalPrice?: number | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PriceDisplay({ price, originalPrice, className, size = "md" }: PriceDisplayProps) {
  const hasDiscount = originalPrice != null && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
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
        ${price.toFixed(2)}
      </span>
      {hasDiscount && (
        <>
          <span className={cn("line-through text-muted-foreground", originalSizeClasses[size])}>
            ${originalPrice.toFixed(2)}
          </span>
          <span className="text-xs font-semibold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
            -{discountPercent}%
          </span>
        </>
      )}
    </div>
  );
}
