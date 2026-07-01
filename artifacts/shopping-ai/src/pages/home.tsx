import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, ArrowRight, Zap, TrendingUp, ShieldCheck, Star, ChevronRight } from "lucide-react";
import { useGetFeaturedProducts, useGetTrendingCategories } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";

const SUGGESTIONS = [
  "Best laptop for video editing under $1500",
  "Noise cancelling headphones for travel",
  "Gaming setup under $2000",
  "Ultralight laptop for students",
];

const STATS = [
  { value: "50+", label: "Products Scored" },
  { value: "8", label: "Categories" },
  { value: "AI", label: "Powered Engine" },
  { value: "Real-time", label: "Price Alerts" },
];

const VALUE_PROPS = [
  {
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Deep AI Analysis",
    description: "We analyse specs, performance data, and reviews to objectively score every product.",
  },
  {
    icon: ShieldCheck,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    title: "Unbiased Scoring",
    description: "Every product gets a detailed AI Score covering reliability, value, and performance.",
  },
  {
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "Price Intelligence",
    description: "Historical price tracking and AI predictions tell you exactly when to buy.",
  },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [placeholder, setPlaceholder] = useState(0);

  const { data: featuredProducts, isLoading: loadingFeatured } = useGetFeaturedProducts();
  const { data: trendingCategories, isLoading: loadingTrending } = useGetTrendingCategories();

  useEffect(() => {
    const t = setInterval(() => setPlaceholder(p => (p + 1) % SUGGESTIONS.length), 3500);
    return () => clearInterval(t);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setLocation(`/agent?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* ── Hero ── */}
      <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center text-center px-4 py-24 overflow-hidden">
        {/* animated background orbs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full bg-primary/15 blur-[120px]"
            animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-20 -right-40 w-[500px] h-[500px] rounded-full bg-violet-500/15 blur-[100px]"
            animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div
            className="absolute -bottom-20 left-1/3 w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-[80px]"
            animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          />
          {/* grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:80px_80px]" />
        </div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-8 text-primary"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">Your Autonomous AI Shopping Agent</span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight max-w-5xl mb-6 leading-[0.9]"
        >
          Find exactly{" "}
          <span className="relative">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-500 to-emerald-400">
              what you need.
            </span>
            <motion.div
              className="absolute -bottom-1 left-0 h-1 bg-gradient-to-r from-primary to-violet-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.8, delay: 0.9 }}
            />
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed"
        >
          Describe what you want in plain English. Our AI scores thousands of products across specs, reviews, and value to find your perfect match.
        </motion.p>

        {/* Search box */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="w-full max-w-2xl"
        >
          <form onSubmit={handleSearch} className="relative flex items-center w-full shadow-2xl shadow-primary/20 rounded-2xl bg-card border border-primary/20 p-2 focus-within:border-primary/60 focus-within:shadow-primary/30 transition-all duration-300">
            <div className="pl-4 pr-3 text-primary">
              <Bot className="w-6 h-6" />
            </div>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`e.g. "${SUGGESTIONS[placeholder]}"`}
              className="flex-1 h-12 bg-transparent outline-none text-base md:text-lg placeholder:text-muted-foreground/50 transition-all"
            />
            <Button type="submit" size="lg" className="rounded-xl px-6 bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/30">
              Ask AI <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-5 flex flex-wrap justify-center gap-2"
          >
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => { setQuery(s); }}
                className="text-xs text-muted-foreground hover:text-primary border border-border/50 hover:border-primary/30 rounded-full px-3 py-1.5 transition-all hover:bg-primary/5"
              >
                {s}
              </button>
            ))}
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl w-full"
        >
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Value Props ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/0 via-muted/40 to-muted/0 -z-10" />
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Why AI-powered shopping?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Stop reading 200-tab comparisons. Let the agent do the heavy lifting.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUE_PROPS.map((prop, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="flex flex-col p-7 rounded-2xl bg-card border border-border/60 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-default"
              >
                <div className={`p-3 rounded-xl ${prop.bg} ${prop.color} w-fit mb-5`}>
                  <prop.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">{prop.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{prop.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="py-20 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Top Picks</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Highly Rated by AI</h2>
          </div>
          <Button variant="outline" onClick={() => setLocation("/products")} className="gap-1 rounded-xl hidden sm:flex">
            View All <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>

        {loadingFeatured ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-52 w-full rounded-2xl" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {featuredProducts?.slice(0, 8).map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}

        <div className="flex justify-center mt-10 sm:hidden">
          <Button variant="outline" onClick={() => setLocation("/products")} className="gap-1 rounded-xl">
            View All <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* ── Trending Categories ── */}
      {!loadingTrending && trendingCategories && trendingCategories.length > 0 && (
        <section className="py-20 bg-muted/30 border-t border-border/50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-10"
            >
              <h2 className="text-3xl font-bold tracking-tight mb-2">Shop by Category</h2>
              <p className="text-muted-foreground">Browse AI-scored products across all categories.</p>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {trendingCategories?.slice(0, 8).map((cat, i) => (
                <motion.button
                  key={cat.category}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  whileHover={{ scale: 1.03, transition: { duration: 0.15 } }}
                  onClick={() => setLocation(`/products?category=${encodeURIComponent(cat.category.toLowerCase())}`)}
                  className="p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all text-left group"
                >
                  <div className="font-bold text-lg group-hover:text-primary transition-colors">{cat.category}</div>
                  <div className="text-sm text-muted-foreground mt-1">{cat.count} products</div>
                  <div className="text-xs text-primary/70 mt-1">Avg Score {cat.avgScore}</div>
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-24 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div className="relative rounded-3xl bg-ai-gradient p-12 overflow-hidden ai-glow">
            <motion.div
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            <Bot className="w-12 h-12 text-white/90 mx-auto mb-5" />
            <h2 className="text-3xl font-black text-white mb-3">Ready to shop smarter?</h2>
            <p className="text-white/80 mb-8">Tell the AI what you need and get personalised recommendations in seconds.</p>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setLocation("/agent")}
              className="gap-2 rounded-xl bg-white text-primary hover:bg-white/90 font-bold shadow-xl"
            >
              <Bot className="w-5 h-5" /> Talk to AI Agent
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
