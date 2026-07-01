import { useRoute } from "wouter";
import { useGetProduct, getGetProductQueryKey, useGetAiScore, getGetAiScoreQueryKey, useGetPricePrediction, getGetPricePredictionQueryKey } from "@workspace/api-client-react";
import { PlaceholderImage } from "@/components/placeholder-image";
import { PriceDisplay } from "@/components/price-display";
import { AiScoreBadge } from "@/components/ai-score-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Heart, ShieldCheck, Activity, Battery, TrendingUp, Users, ArrowRight } from "lucide-react";
import { useAddToCart, useAddToWishlist, getGetCartQueryKey, getGetWishlistQueryKey } from "@workspace/api-client-react";
import { getSessionId } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const productId = parseInt(params?.id || "0", 10);
  const sessionId = getSessionId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: product, isLoading: loadingProduct } = useGetProduct(productId, { 
    query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId) } 
  });
  
  const { data: aiScore, isLoading: loadingScore } = useGetAiScore(productId, {
    query: { enabled: !!productId, queryKey: getGetAiScoreQueryKey(productId) }
  });

  const { data: pricePrediction, isLoading: loadingPrediction } = useGetPricePrediction(productId, {
    query: { enabled: !!productId, queryKey: getGetPricePredictionQueryKey(productId) }
  });

  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();

  const handleAddToCart = () => {
    if (!product) return;
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

  const handleAddToWishlist = () => {
    if (!product) return;
    addToWishlist.mutate(
      { data: { productId: product.id, sessionId } },
      {
        onSuccess: () => {
          toast({ title: "Added to wishlist" });
          queryClient.invalidateQueries({ queryKey: getGetWishlistQueryKey() });
        },
      }
    );
  };

  if (loadingProduct) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <Skeleton className="w-full md:w-1/2 aspect-square rounded-xl" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-32 w-full" />
            <div className="flex gap-4 pt-4">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 flex-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return <div className="p-8 text-center">Product not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Product Header */}
      <div className="flex flex-col lg:flex-row gap-10 mb-12">
        <div className="w-full lg:w-1/2 shrink-0">
          <div className="rounded-2xl overflow-hidden border bg-muted aspect-square sticky top-24">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <PlaceholderImage name={product.name} />
            )}
          </div>
        </div>

        <div className="flex flex-col flex-1">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{product.brand}</span>
            <AiScoreBadge score={product.aiScore} className="text-sm px-3 py-1" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <PriceDisplay price={product.price} originalPrice={product.originalPrice} size="lg" />
            <div className="h-6 w-px bg-border"></div>
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <span className="text-foreground">{product.rating}</span> ★ ({product.reviewCount} reviews)
            </div>
          </div>

          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            {product.description}
          </p>

          <div className="flex gap-4 mb-8">
            <Button size="lg" className="flex-1 h-14 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20" onClick={handleAddToCart}>
              <ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart
            </Button>
            <Button variant="outline" size="icon" className="h-14 w-14 shrink-0" onClick={handleAddToWishlist}>
              <Heart className="w-6 h-6" />
            </Button>
          </div>

          {/* Key Specs Summary */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="bg-muted/50 rounded-xl p-5 border">
              <h3 className="font-semibold mb-4">Key Specifications</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                {Object.entries(product.specs).slice(0, 6).map(([key, value]) => (
                  <div key={key}>
                    <div className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="font-medium">{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 mb-8">
          <TabsTrigger value="ai" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full text-base">AI Analysis</TabsTrigger>
          <TabsTrigger value="price" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full text-base">Price Intelligence</TabsTrigger>
          <TabsTrigger value="specs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full text-base">Full Specs</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {loadingScore ? <Skeleton className="h-64 w-full rounded-xl" /> : aiScore ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-card border rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-ai-gradient flex items-center justify-center text-white ai-glow">
                    <span className="text-xl font-bold">{aiScore.overall}</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">AI Verdict</h3>
                    <p className="text-muted-foreground">Comprehensive automated analysis</p>
                  </div>
                </div>
                <p className="text-lg leading-relaxed">{aiScore.summary}</p>
              </div>

              <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
                <h4 className="font-semibold text-lg border-b pb-4">Score Breakdown</h4>
                
                {[
                  { label: "Performance", val: aiScore.performance, icon: Activity },
                  { label: "Value / Price", val: aiScore.price, icon: TrendingUp },
                  { label: "Reliability", val: aiScore.reliability, icon: ShieldCheck },
                  { label: "Battery / Efficiency", val: aiScore.battery, icon: Battery },
                  { label: "Popularity", val: aiScore.popularity, icon: Users },
                ].map((score, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <score.icon className="w-4 h-4 text-muted-foreground" />
                        {score.label}
                      </div>
                      <span className={score.val >= 80 ? "text-green-500" : score.val >= 60 ? "text-yellow-500" : "text-red-500"}>
                        {score.val}/100
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${score.val >= 80 ? "bg-green-500" : score.val >= 60 ? "bg-yellow-500" : "bg-red-500"}`} 
                        style={{ width: `${score.val}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="text-muted-foreground">No AI analysis available for this product yet.</div>}
        </TabsContent>

        <TabsContent value="price" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {loadingPrediction ? <Skeleton className="h-64 w-full rounded-xl" /> : pricePrediction ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-card border rounded-2xl p-8 shadow-sm">
                <h3 className="text-xl font-bold mb-2">Price Prediction</h3>
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-3xl font-bold capitalize text-primary">{pricePrediction.predictedTrend}</span>
                  <span className="text-muted-foreground">({pricePrediction.confidence}% confidence)</span>
                </div>
                
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6 text-accent-foreground">
                  <span className="font-semibold block mb-1">Best time to buy:</span>
                  {pricePrediction.bestTimeToBuy}
                </div>
                
                <p className="text-muted-foreground leading-relaxed">
                  {pricePrediction.analysis}
                </p>
              </div>
              
              <div className="bg-card border rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center">
                <TrendingUp className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-center text-muted-foreground">Price history chart visualization would render here.</p>
              </div>
            </div>
          ) : <div className="text-muted-foreground">Price intelligence data currently unavailable.</div>}
        </TabsContent>

        <TabsContent value="specs" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-card border rounded-2xl p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-6">Detailed Specifications</h3>
            {product.specs && Object.keys(product.specs).length > 0 ? (
              <div className="divide-y">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="w-1/3 text-muted-foreground font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="flex-1 font-medium">{String(value)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">Detailed specifications not available for this product.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
