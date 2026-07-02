import { Link } from "wouter";
import { motion } from "framer-motion";
import { Product } from "@workspace/api-client-react";
import { AiScoreBadge } from "./ai-score-badge";
import { PriceDisplay } from "./price-display";
import { PlaceholderImage } from "./placeholder-image";
import { Button } from "./ui/button";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { useAddToCart, useAddToWishlist, useGetCart, getGetCartQueryKey, useGetWishlist, getGetWishlistQueryKey } from "@workspace/api-client-react";
import { getSessionId } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "./ui/checkbox";

interface ProductCardProps {
  product: Product;
  onCompareSelect?: (product: Product, selected: boolean) => void;
  isSelectedForCompare?: boolean;
  showCompareToggle?: boolean;
  index?: number;
}

export function ProductCard({ product, onCompareSelect, isSelectedForCompare = false, showCompareToggle = false, index = 0 }: ProductCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionId = getSessionId();

  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const { data: wishlistItems } = useGetWishlist();
  const isWishlisted = wishlistItems?.some(w => w.productId === product.id) ?? false;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart.mutate(
      { data: { productId: product.id, quantity: 1, sessionId } },
      {
        onSuccess: () => {
          toast({ title: "Added to cart", description: `${product.name} added to your cart.` });
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        },
      }
    );
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToWishlist.mutate(
      { data: { productId: product.id, sessionId } },
      {
        onSuccess: () => {
          toast({ title: isWishlisted ? "Already saved" : "Saved!", description: `${product.name} added to wishlist.` });
          queryClient.invalidateQueries({ queryKey: getGetWishlistQueryKey() });
        },
      }
    );
  };

  const hasDiscount = product.originalPrice != null && product.originalPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1.5 hover:border-primary/40"
    >
      {hasDiscount && (
        <div className="absolute top-3 left-3 z-10">
          <span className="bg-green-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
            -{discountPct}%
          </span>
        </div>
      )}

      {showCompareToggle && onCompareSelect && (
        <div className={`absolute z-10 ${hasDiscount ? "top-3 left-16" : "top-3 left-3"}`}>
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-1.5 shadow-sm">
            <Checkbox
              checked={isSelectedForCompare}
              onCheckedChange={(checked) => onCompareSelect(product, checked as boolean)}
            />
          </div>
        </div>
      )}

      <Link href={`/products/${product.id}`} className="flex-1 flex flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted/50">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <PlaceholderImage name={product.name} className="transition-transform duration-700 group-hover:scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-3 right-3">
            <AiScoreBadge score={product.aiScore} />
          </div>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleAddToWishlist}
            className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 ${
              isWishlisted ? "bg-rose-500 text-white" : "bg-background/90 backdrop-blur-sm text-muted-foreground hover:text-rose-500"
            }`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? "fill-current" : ""}`} />
          </motion.button>
        </div>

        <div className="p-4 flex flex-col flex-1">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{product.brand}</div>
          <h3 className="font-semibold text-base leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">{product.name}</h3>

          {product.rating != null && (
            <div className="flex items-center gap-1 mb-3">
              <div className="flex">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-3 h-3 ${s <= Math.round(product.rating!) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{product.rating?.toFixed(1)}</span>
              {product.reviewCount != null && (
                <span className="text-xs text-muted-foreground/60">({product.reviewCount?.toLocaleString()})</span>
              )}
            </div>
          )}

          <div className="mt-auto">
            <PriceDisplay price={product.price} originalPrice={product.originalPrice} size="md" />
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleAddToCart}
          disabled={addToCart.isPending}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm py-2.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-60"
        >
          <ShoppingCart className="w-4 h-4" />
          {addToCart.isPending ? "Adding…" : "Add to Cart"}
        </motion.button>
      </div>
    </motion.div>
  );
}
