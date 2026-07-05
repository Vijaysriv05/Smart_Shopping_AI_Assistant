import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetCart, useRemoveFromCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { getSessionId } from "@/lib/session";
import { PriceDisplay } from "@/components/price-display";
import { Button } from "@/components/ui/button";
import { PlaceholderImage } from "@/components/placeholder-image";
import { Trash2, ArrowRight, ShoppingBag, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export default function Cart() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: cartItems, isLoading } = useGetCart();
  const removeFromCart = useRemoveFromCart();

  const handleRemove = (id: number) => {
    removeFromCart.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Removed from cart" });
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      }
    });
  };

  const subtotal = cartItems?.reduce((acc, item) => acc + (item.product.price * item.quantity), 0) || 0;
  const savings = cartItems?.reduce((acc, item) => {
    if (item.product.originalPrice && item.product.originalPrice > item.product.price) {
      return acc + ((item.product.originalPrice - item.product.price) * item.quantity);
    }
    return acc;
  }, 0) || 0;

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleCheckout = async () => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": getSessionId(),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Checkout failed");
      }
      toast({ title: "Order placed!", description: "Your order has been confirmed." });
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      setLocation("/dashboard");
    } catch (e: any) {
      toast({ title: "Checkout failed", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="text-3xl font-bold mb-8">Your Cart</h1>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 flex flex-col gap-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
          <div className="w-full md:w-80">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Looks like you haven't added anything to your cart yet. Ask the AI Agent for recommendations!
        </p>
        <Button size="lg" onClick={() => setLocation("/agent")} className="bg-ai-gradient border-none ai-glow">
          <Sparkles className="w-4 h-4 mr-2" />
          Ask AI for Recommendations
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Your Cart ({cartItems.length})</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 flex flex-col gap-4">
          {cartItems.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border bg-card relative">
              <Link href={`/products/${item.product.id}`} className="w-full sm:w-32 h-32 shrink-0 rounded-lg overflow-hidden bg-muted">
                {item.product.imageUrl ? (
                  <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                ) : (
                  <PlaceholderImage name={item.product.name} />
                )}
              </Link>
              
              <div className="flex flex-col flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{item.product.brand}</div>
                    <Link href={`/products/${item.product.id}`} className="font-semibold text-lg hover:text-primary transition-colors line-clamp-2">
                      {item.product.name}
                    </Link>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleRemove(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="mt-auto pt-4 flex items-center justify-between">
                  <div className="text-sm font-medium px-3 py-1 bg-muted rounded-full">
                    Qty: {item.quantity}
                  </div>
                  <PriceDisplay price={item.product.price} originalPrice={item.product.originalPrice} size="lg" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full lg:w-96 shrink-0">
          <div className="rounded-xl border bg-card p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCents(subtotal)}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-green-500">
                  <span>Savings</span>
                  <span>-{formatCents(savings)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>Calculated at checkout</span>
              </div>
            </div>
            
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between items-end">
                <span className="font-bold">Total</span>
                <span className="text-2xl font-bold">{formatCents(subtotal)}</span>
              </div>
            </div>
            
            <Button size="lg" className="w-full mb-4" onClick={handleCheckout}>
              Proceed to Checkout
            </Button>
            
            <Button variant="outline" className="w-full" onClick={() => setLocation("/products")}>
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
