import { motion } from "framer-motion";
import { useGetDashboardStats, useGetRecommendationHistory, useGetTrendingCategories, useGetAiMemory, useGetCart } from "@workspace/api-client-react";
import { getSessionId } from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Activity, ShoppingBag, Heart, DollarSign, Bot, ArrowRight, History, TrendingUp, Zap, Target, FileText, Download, TrendingDown, Percent, Award, UserCheck } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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

  const [activeTab, setActiveTab] = useState<"overview" | "report">("overview");
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    if (activeTab === "report") {
      setLoadingReport(true);
      fetch("/api/ai/reports", {
        headers: {
          "x-session-id": getSessionId(),
        }
      })
        .then(res => res.json())
        .then(data => {
          setReport(data);
          setLoadingReport(false);
        })
        .catch(err => {
          console.error("Report fetch error:", err);
          setLoadingReport(false);
        });
    }
  }, [activeTab]);

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

  // Chart data preppers
  const monthlyData = report?.monthlySpending
    ? Object.entries(report.monthlySpending).map(([month, val]) => ({
        name: month,
        amount: Math.round(((val as number) / 100) * 100) / 100
      }))
    : [
        { name: "Mar", amount: 120 },
        { name: "Apr", amount: 450 },
        { name: "May", amount: 300 },
        { name: "Jun", amount: 890 },
        { name: "Jul", amount: 560 }
      ];

  const pieData = report?.favoriteCategories
    ? (report.favoriteCategories as string[]).map((cat, idx) => ({
        name: cat,
        value: idx === 0 ? 55 : idx === 1 ? 30 : 15
      }))
    : [
        { name: "Laptops", value: 50 },
        { name: "Smartphones", value: 30 },
        { name: "Accessories", value: 20 }
      ];

  const COLORS = ["#3b82f6", "#a855f7", "#ec4899", "#10b981"];

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Personal Dashboard</h1>
            <p className="text-sm text-muted-foreground">Your shopping activity and analytics report</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-muted/60 p-1 rounded-xl border self-start">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "overview"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "report"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            AI Spending Report
          </button>
        </div>
      </div>

      {activeTab === "overview" ? (
        <>
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
            {/* AI Consultations History */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2 bg-card border rounded-2xl overflow-hidden shadow-sm"
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
                    {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
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
                    <div key={item.id} className="p-5 hover:bg-muted/30 transition-colors group">
                      <div className="text-xs text-muted-foreground mb-1">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                      <div className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                        "{item.query}"
                      </div>
                      {item.reasoning && (
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{item.reasoning}</p>
                      )}
                      <Link href={`/agent?q=${encodeURIComponent(item.query)}`} className="inline-flex items-center text-xs font-semibold text-primary hover:underline">
                        Revisit <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Right Side Info Columns */}
            <div className="space-y-5">
              {/* Budget tracker */}
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <Target className="w-5 h-5 text-primary" />
                  <h2 className="font-bold">Budget Tracker</h2>
                </div>
                {budgetLimit > 0 ? (
                  <BudgetGauge spent={cartTotal} budget={budgetLimit} />
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">No budget limit configured.</p>
                    <Link href="/profile" className="text-primary text-sm font-medium hover:underline">
                      Configure Profile Budget →
                    </Link>
                  </div>
                )}
              </div>

              {/* AI Shopping Profile */}
              <div className="bg-ai-gradient rounded-2xl p-6 text-white relative overflow-hidden shadow-md">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse" />
                <Zap className="w-7 h-7 text-white/85 mb-3" />
                <h2 className="font-bold text-lg mb-1">AI Shopping Profile</h2>
                <p className="text-white/80 text-xs mb-4">
                  {memory?.userProfile ?? "Set preferences to personalize recommendations."}
                </p>
                <div className="space-y-2 text-sm border-t border-white/10 pt-3">
                  <div className="flex justify-between">
                    <span className="text-white/70">Category Preference</span>
                    <span className="font-bold">{stats?.topCategory ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Average AI Score</span>
                    <span className="font-bold">{stats?.avgAiScore ?? 0}/100</span>
                  </div>
                </div>
                <Link href="/profile" className="mt-5 inline-flex items-center text-xs font-semibold text-white/90 hover:text-white">
                  Update Profile <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>

              {/* Category Trends */}
              {trending && trending.length > 0 && (
                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h2 className="font-bold">Category Trends</h2>
                  </div>
                  <div className="space-y-3">
                    {trending.slice(0, 4).map((cat, i) => (
                      <div key={cat.category} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{i + 1}. {cat.category}</span>
                        <span className="font-bold text-primary">{cat.avgScore}/100</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* SPENDING REPORT TAB CONTENT */
        <div id="print-section" className="space-y-8">
          <div className="flex items-center justify-between no-print border-b pb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5 text-primary" />
              Complete Shopping Analytics Report
            </h2>
            <Button onClick={() => window.print()} size="sm" className="flex items-center gap-1.5 font-semibold">
              <Download className="w-4 h-4" /> Download PDF Report
            </Button>
          </div>

          {loadingReport ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
              </div>
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
          ) : report ? (
            <>
              {/* Report Header (Only visible in Print) */}
              <div className="hidden print:block border-b-2 pb-6 mb-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-black text-primary">GOVAL AI</h1>
                    <p className="text-sm text-muted-foreground mt-1">Autonomous Shopping Analytics Statement</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground font-semibold">Report Generated On</span>
                    <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* KPI metrics row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="p-5 border rounded-2xl bg-card">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-1">Total Purchases</span>
                  <div className="text-2xl font-black text-foreground flex items-baseline gap-1">
                    {report.totalOrders} <span className="text-xs text-muted-foreground font-medium">orders</span>
                  </div>
                </div>

                <div className="p-5 border rounded-2xl bg-card">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-1">Total Spending</span>
                  <div className="text-2xl font-black text-foreground">
                    ${(report.totalSpending / 100).toFixed(2)}
                  </div>
                </div>

                <div className="p-5 border rounded-2xl bg-card">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-1">Total Savings</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    ${(report.totalSavings / 100).toFixed(2)}
                    <span className="text-xs font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full text-emerald-600">
                      -{Math.round((report.totalSavings / (report.totalSpending || 1)) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="p-5 border rounded-2xl bg-card">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-1">Budget Utilisation</span>
                  <div className="text-2xl font-black text-foreground">
                    {report.budgetUtilization}%
                  </div>
                </div>
              </div>

              {/* Scores row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-5 border rounded-2xl bg-card flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Shopping Score</span>
                    <p className="text-xs text-muted-foreground">Based on purchase discounts & AI savings.</p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xl border">
                    {report.shoppingScore}
                  </div>
                </div>

                <div className="p-5 border rounded-2xl bg-card flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Loyalty Index</span>
                    <p className="text-xs text-muted-foreground">Reflects order history and brand engagement.</p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xl border">
                    {report.loyaltyScore}
                  </div>
                </div>

                <div className="p-5 border rounded-2xl bg-card flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">AI Accuracy</span>
                    <p className="text-xs text-muted-foreground">Based on accepted/rejected suggestions.</p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-xl border">
                    {report.recommendationAccuracy}%
                  </div>
                </div>
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 border rounded-2xl p-6 bg-card">
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-widest mb-6 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-primary" /> Spending Trend Over Time
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(value) => [`$${value}`, 'Spending']} />
                        <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="border rounded-2xl p-6 bg-card flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-foreground uppercase tracking-widest mb-6">
                      Category Distribution
                    </h3>
                    <div className="h-44 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-black text-foreground">{pieData[0]?.name || "—"}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Favorite</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    {pieData.map((entry, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                          <span className="font-medium text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="font-bold text-foreground">{entry.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommendation Feedback summary details */}
              <div className="border rounded-2xl p-6 bg-card">
                <h3 className="font-bold text-sm text-foreground uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-primary" /> Recommendation Tuning Performance
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div className="p-4 bg-muted/30 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Accepted Suggestions</span>
                    <span className="text-xl font-bold text-emerald-600">{report.acceptedSuggestions}</span>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Ignored Suggestions</span>
                    <span className="text-xl font-bold text-muted-foreground">{report.ignoredSuggestions}</span>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Favorite Brands</span>
                    <span className="text-sm font-bold text-foreground block truncate">
                      {report.favoriteBrands && report.favoriteBrands.length > 0 ? report.favoriteBrands.join(", ") : "None"}
                    </span>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Coupons Redeemed</span>
                    <span className="text-xl font-bold text-primary">{report.couponsUsed}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center border rounded-2xl bg-card">
              <p className="text-muted-foreground text-sm">Failed to generate report statement. Please place some orders first.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
