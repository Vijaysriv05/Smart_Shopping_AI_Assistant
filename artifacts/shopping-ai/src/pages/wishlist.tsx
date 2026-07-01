import { Link, useLocation } from "wouter";
import { useGetWishlist, useRemoveFromWishlist, getGetWishlistQueryKey } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Heart, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Wishlist() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: wishlistItems, isLoading } = useGetWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  const handleRemove = (id: number) => {
    removeFromWishlist.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Removed from wishlist" });
        queryClient.invalidateQueries({ queryKey: getGetWishlistQueryKey() });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">My Wishlist</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[250px] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!wishlistItems || wishlistItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
          <Heart className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Your wishlist is empty</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Save items you're interested in by clicking the heart icon on products.
        </p>
        <Button size="lg" onClick={() => setLocation("/products")}>
          <Search className="w-4 h-4 mr-2" />
          Browse Products
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Wishlist</h1>
        <div className="text-muted-foreground">
          {wishlistItems.length} items
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {wishlistItems.map((item) => (
          <div key={item.id} className="relative group">
            <ProductCard product={item.product} />
            <Button 
              variant="destructive" 
              size="sm"
              className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRemove(item.id);
              }}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
