import { motion } from "framer-motion";
import { useGetDashboardStats, useGetRecommendationHistory, useGetTrendingCategories, useGetAiMemory, useGetCart } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ShoppingBag, Heart, DollarSign, Bot, ArrowRight, History, TrendingUp, Zap, Target } from "lucide-react";
import { Link } from "wouter";

function BudgetGauge({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const overBudget = spent > budget && budget > 0;
  const color = overBudget ? "#ef4444" : pct > 75 ? "#f59e0b" : "#22c55e";

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Cart total</span>
        <span className={`font-bold ${overBudget ? "text-red-500" : "text-foreground"}`}>
          ${(spent / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>$0</span>
        <span>Budget: ${(budget / 100).toLocaleString()}</span>
      </div>
      {overBudget && (
        <p className="text-xs text-red-500 font-medium">
          ⚠ Over budget by ${((spent - budget) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      )}
      {!overBudget && budget > 0 && (
        <p className="text-xs text-muted-foreground">
          ${((budget - spent) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} remaining
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: loadingStats } = useGetDashboardStats();
  const { data: history, isLoading: loadingHistory } = useGetRecommendationHistory();
  const { data: trending } = useGetTrendingCategories();
  const { data: memory } = useGetAiMemory();
  const { data: cartItems } = useGetCart();

  const cartTotal = cartItems?.reduce((sum, item) => sum + item.product.price * item.quantity, 0) ?? 0;
  const budgetLimit = memory?.budget ?? 0;

  if (loadingStats) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Savings", value: `$${((stats?.savedBudget ?? 0) / 100).toLocaleString()}`, sub: "across all discounts", icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10", glow: "shadow-emerald-500/20" },
    { label: "AI Consultations", value: stats?.recommendationsToday ?? 0, sub: "today", icon: Bot, color: "text-primary", bg: "bg-primary/10", glow: "shadow-primary/20" },
    { label: "Cart Items", value: stats?.cartItems ?? 0, sub: `$${(cartTotal / 100).toFixed(2)} total`, icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-500/10", glow: "shadow-blue-500/20" },
    { label: "Wishlist", value: stats?.wishlistItems ?? 0, sub: "saved for later", icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10", glow: "shadow-rose-500/20" },
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-10"
      >
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personal Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your AI shopping activity at a glance</p>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-6 rounded-2xl border bg-card hover:shadow-xl ${stat.glow} transition-all duration-300`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">{stat.label}</h3>
              <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI History */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-card border rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" />
              Recent AI Consultations
            </h2>
            <Link href="/agent" className="text-xs text-primary hover:underline flex items-center gap-1">
              New chat <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y">
            {loadingHistory ? (
              <div className="p-6 space-y-4">
                {[1,2].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : history?.length === 0 ? (
              <div className="p-12 text-center">
                <Bot className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No recommendation history yet.</p>
                <Link href="/agent" className="text-primary text-sm hover:underline mt-2 inline-block">
                  Start a conversation →
                </Link>
              </div>
            ) : (
              history?.slice(0, 5).map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.07 }}
                  className="p-5 hover:bg-muted/30 transition-colors group"
                >
                  <div className="text-xs text-muted-foreground mb-1">{new Date(item.createdAt).toLocaleDateString()}</div>
                  <div className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">"{item.query}"</div>
                  {item.reasoning && (
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{item.reasoning}</p>
                  )}
                  <Link href={`/agent?q=${encodeURIComponent(item.query)}`} className="inline-flex items-center text-xs font-semibold text-primary hover:underline">
                    Revisit <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Budget Tracker */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-card border rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="font-bold">Budget Tracker</h2>
            </div>
            {budgetLimit > 0 ? (
              <BudgetGauge spent={cartTotal} budget={budgetLimit} />
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">No budget set yet.</p>
                <Link href="/profile" className="text-primary text-sm font-medium hover:underline">
                  Set your budget →
                </Link>
              </div>
            )}
          </motion.div>

          {/* AI Profile */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-ai-gradient rounded-2xl p-6 text-white relative overflow-hidden"
          >
            <motion.div
              className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <Zap className="w-7 h-7 text-white/80 mb-3 relative z-10" />
            <h2 className="font-bold text-lg mb-1 relative z-10">AI Shopping Profile</h2>
            <p className="text-white/70 text-xs mb-4 relative z-10">
              {memory?.userProfile ?? "Profile not set — personalise your AI recommendations."}
            </p>
            <div className="space-y-2 relative z-10">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Top Category</span>
                <span className="font-bold">{stats?.topCategory ?? "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Avg AI Score</span>
                <span className="font-bold">{stats?.avgAiScore ?? 0}/100</span>
              </div>
              {memory?.favoriteCategories && (memory.favoriteCategories as string[]).length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Fav Categories</span>
                  <span className="font-bold text-right text-xs">{(memory.favoriteCategories as string[]).slice(0,2).join(", ")}</span>
                </div>
              )}
            </div>
            <Link href="/profile" className="mt-5 inline-flex items-center text-xs font-semibold text-white/90 hover:text-white relative z-10">
              Edit Profile <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </motion.div>

          {/* Trending */}
          {trending && trending.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 }}
              className="bg-card border rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="font-bold">Category Trends</h2>
              </div>
              <div className="space-y-3">
                {trending.slice(0, 4).map((cat, i) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      <span className="text-sm font-medium truncate">{cat.category}</span>
                    </div>
                    <div className="text-xs text-right shrink-0 ml-2">
                      <span className="font-semibold text-primary">{cat.avgScore}</span>
                      <span className="text-muted-foreground"> / 100</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
