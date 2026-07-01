import { useGetDashboardStats, useGetRecommendationHistory } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ShoppingBag, Heart, DollarSign, Bot, ArrowRight, History } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: loadingStats } = useGetDashboardStats();
  const { data: history, isLoading: loadingHistory } = useGetRecommendationHistory();

  if (loadingStats) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Personal Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const statCards = [
    { label: "Saved by AI", value: `$${stats?.savedBudget || 0}`, icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "AI Recommendations", value: stats?.recommendationsToday || 0, icon: Bot, color: "text-primary", bg: "bg-primary/10" },
    { label: "Items in Cart", value: stats?.cartItems || 0, icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Wishlist Items", value: stats?.wishlistItems || 0, icon: Heart, color: "text-accent", bg: "bg-accent/10" },
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Activity className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Personal Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((stat, i) => (
          <div key={i} className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">{stat.label}</h3>
              <div className={`p-2 rounded-full ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" />
                Recent AI Consultations
              </h2>
            </div>
            <div className="divide-y">
              {loadingHistory ? (
                <div className="p-6 space-y-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : history?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No recommendation history yet. Talk to the AI Agent to get started!
                </div>
              ) : (
                history?.slice(0, 5).map((item) => (
                  <div key={item.id} className="p-6 hover:bg-muted/30 transition-colors">
                    <div className="text-sm text-muted-foreground mb-1">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                    <div className="font-medium text-lg mb-2">"{item.query}"</div>
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{item.reasoning}</p>
                    <Link href={`/agent?q=${encodeURIComponent(item.query)}`} className="inline-flex items-center text-sm font-medium text-primary hover:underline">
                      Revisit consultation <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-ai-gradient rounded-2xl p-6 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
            <h2 className="text-xl font-bold mb-2 relative z-10">AI Shopping Profile</h2>
            <p className="text-white/80 text-sm mb-6 relative z-10">
              The agent learns your preferences over time to give better recommendations.
            </p>
            <div className="space-y-3 relative z-10">
              <div className="flex justify-between items-center text-sm">
                <span>Favorite Category</span>
                <span className="font-bold">{stats?.topCategory || "Learning..."}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Avg. Recommended Score</span>
                <span className="font-bold">{stats?.avgAiScore || 0}/100</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
