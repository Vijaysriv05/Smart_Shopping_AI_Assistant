import { Link } from "wouter";
import { Product } from "@workspace/api-client-react";
import { AiScoreBadge } from "./ai-score-badge";
import { PriceDisplay } from "./price-display";
import { PlaceholderImage } from "./placeholder-image";
import { Button } from "./ui/button";
import { Heart, ShoppingCart } from "lucide-react";
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
}

export function ProductCard({ product, onCompareSelect, isSelectedForCompare = false, showCompareToggle = false }: ProductCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionId = getSessionId();

  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();

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
          toast({ title: "Added to wishlist", description: `${product.name} saved for later.` });
          queryClient.invalidateQueries({ queryKey: getGetWishlistQueryKey() });
        },
      }
    );
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary/50">
      {showCompareToggle && onCompareSelect && (
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-background/80 backdrop-blur rounded p-1">
            <Checkbox 
              checked={isSelectedForCompare} 
              onCheckedChange={(checked) => onCompareSelect(product, checked as boolean)} 
            />
          </div>
        </div>
      )}
      
      <Link href={`/products/${product.id}`} className="flex-1">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <PlaceholderImage name={product.name} className="transition-transform duration-500 group-hover:scale-105" />
          )}
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            <AiScoreBadge score={product.aiScore} />
          </div>
        </div>
        
        <div className="p-4 flex flex-col flex-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{product.brand}</div>
          <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2">{product.name}</h3>
          
          <div className="mt-auto pt-4 flex items-center justify-between">
            <PriceDisplay price={product.price} originalPrice={product.originalPrice} size="md" />
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4 flex items-center gap-2">
        <Button variant="outline" size="icon" className="shrink-0" onClick={handleAddToWishlist}>
          <Heart className="w-4 h-4" />
        </Button>
        <Button className="flex-1 w-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleAddToCart}>
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
