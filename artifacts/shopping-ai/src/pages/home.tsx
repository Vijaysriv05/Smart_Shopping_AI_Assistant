import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, ArrowRight, Zap, TrendingUp, ShieldCheck } from "lucide-react";
import { useGetFeaturedProducts, useGetTrendingCategories } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");

  const { data: featuredProducts, isLoading: loadingFeatured } = useGetFeaturedProducts();
  const { data: trendingCategories, isLoading: loadingTrending } = useGetTrendingCategories();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setLocation(`/agent?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative w-full py-20 md:py-32 overflow-hidden flex flex-col items-center justify-center text-center px-4">
        {/* Background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[120px]"></div>
          <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-accent/10 blur-[100px]"></div>
          <div className="absolute bottom-0 left-[20%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[80px]"></div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border/50 backdrop-blur-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">Meet your personal AI shopping expert</span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          Find exactly what you need. <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Without the search fatigue.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          Describe what you're looking for in plain English. Our AI analyzes thousands of products, reviews, and specs to find your perfect match.
        </p>

        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          <form onSubmit={handleSearch} className="relative flex items-center w-full shadow-2xl rounded-full bg-background/80 backdrop-blur-xl border border-primary/20 p-2 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all">
            <div className="pl-4 pr-2 text-muted-foreground">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 'I need a laptop for video editing under $1500 with good battery'" 
              className="flex-1 h-12 bg-transparent outline-none text-lg placeholder:text-muted-foreground/70"
            />
            <Button type="submit" size="lg" className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground ai-glow">
              Ask AI <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>
          
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
            <span className="text-muted-foreground">Try:</span>
            {["Noise cancelling headphones for running", "Best coffee maker for beginners", "Mechanical keyboard under $100"].map((suggestion) => (
              <button 
                key={suggestion}
                type="button"
                onClick={() => setQuery(suggestion)}
                className="text-foreground hover:text-primary hover:underline transition-colors"
              >
                "{suggestion}"
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-20 bg-muted/30 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="w-8 h-8 text-primary" />,
                title: "Deep Analysis",
                description: "We don't just match keywords. We analyze specs, performance data, and real user reviews to score products objectively."
              },
              {
                icon: <ShieldCheck className="w-8 h-8 text-accent" />,
                title: "Unbiased Scoring",
                description: "Every product receives a detailed AI Score breakdown covering reliability, value, performance, and more."
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-blue-500" />,
                title: "Price Intelligence",
                description: "Historical price tracking and future price predictions tell you exactly when to buy to get the best deal."
              }
            ].map((prop, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl bg-background/50 border border-border/50 hover:bg-background/80 transition-colors">
                <div className="p-4 rounded-full bg-muted mb-4">
                  {prop.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{prop.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{prop.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 container mx-auto px-4">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Highly Rated by AI</h2>
            <p className="text-muted-foreground">Products with exceptional AI scores across all categories.</p>
          </div>
          <Button variant="outline" onClick={() => setLocation('/products')}>View All</Button>
        </div>

        {loadingFeatured ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col space-y-3">
                <Skeleton className="h-[250px] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts?.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
