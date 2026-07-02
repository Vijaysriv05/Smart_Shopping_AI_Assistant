import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Package, Star, Zap, BarChart3, ShoppingCart, Gift, Users,
  RefreshCw, ChevronRight, ArrowUp, ArrowDown, Minus, Shield,
  Flame, Tag, Copy, Layers, Eye, Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

async function fetchInsights() {
  const res = await fetch(`${BASE_URL}/api/ai/autonomous-insights`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: any; color: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 bg-card flex flex-col gap-2 ${color}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, badge }: { icon: any; title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
    </div>
  );
}

export default function AutonomousDashboard() {
  const [tab, setTab] = useState<"overview" | "inventory" | "bundles" | "reviews" | "trends" | "users">("overview");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["autonomous-insights"],
    queryFn: fetchInsights,
    staleTime: 60_000,
  });

  const tabs = [
    { id: "overview", label: "Overview", icon: Brain },
    { id: "inventory", label: "Inventory AI", icon: Package },
    { id: "bundles", label: "Bundle AI", icon: Gift },
    { id: "reviews", label: "Review Intel", icon: Shield },
    { id: "trends", label: "Trend Analysis", icon: TrendingUp },
    { id: "users", label: "User Insights", icon: Users },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-16 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Autonomous AI Command Center</h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                  AI running continuously — zero human intervention required
                  {data && <span className="ml-2 opacity-60">· Last analysis: {new Date(data.generatedAt).toLocaleTimeString()}</span>}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Re-analyze
            </Button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : !data ? (
          <div className="text-center py-24 text-muted-foreground">Failed to load AI insights.</div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === "overview" && <OverviewTab data={data} />}
            {tab === "inventory" && <InventoryTab data={data} />}
            {tab === "bundles" && <BundlesTab data={data} />}
            {tab === "reviews" && <ReviewsTab data={data} />}
            {tab === "trends" && <TrendsTab data={data} />}
            {tab === "users" && <UsersTab data={data} />}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ data }: { data: any }) {
  return (
    <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* AI Decisions Feed */}
      <div className="mb-6 rounded-2xl border bg-gradient-to-br from-violet-500/5 via-blue-500/5 to-transparent p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="font-bold text-sm">AI Autonomous Decisions — Generated Now</span>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">LIVE</Badge>
        </div>
        <div className="space-y-2">
          {data.aiDecisions.map((d: string, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-2.5 text-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>{d}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Products Analyzed" value={data.summary.totalProducts} icon={Bot} color="" sub="Full catalog scan" />
        <StatCard label="Overpriced Flagged" value={data.summary.overpricedCount} icon={AlertTriangle} color="" sub="Needs repricing" />
        <StatCard label="Bundles Generated" value={data.summary.bundlesGenerated} icon={Gift} color="" sub="Auto-created" />
        <StatCard label="Restock Alerts" value={data.summary.restockAlerts} icon={Package} color="" sub="Low inventory" />
      </div>

      {/* Critical Alerts */}
      {data.criticalAlerts.length > 0 && (
        <div className="mb-8">
          <SectionHeader icon={AlertTriangle} title="Critical Alerts" badge={`${data.criticalAlerts.length} active`} />
          <div className="space-y-3">
            {data.criticalAlerts.map((alert: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-start gap-3 p-4 rounded-xl border ${
                  alert.severity === "high" ? "border-red-500/30 bg-red-500/5" : "border-yellow-500/30 bg-yellow-500/5"
                }`}
              >
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${alert.severity === "high" ? "text-red-500" : "text-yellow-500"}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{alert.message}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 capitalize">{alert.type} alert · {alert.severity} severity</div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${alert.severity === "high" ? "border-red-500/40 text-red-400" : "border-yellow-500/40 text-yellow-400"}`}>
                  {alert.severity.toUpperCase()}
                </Badge>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Overpriced + Discount suggestions in 2 col */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <SectionHeader icon={Tag} title="AI Repricing Suggestions" badge={`${data.overpriced.length} flagged`} />
          <div className="space-y-3">
            {data.overpriced.slice(0, 4).map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">${(p.price / 100).toFixed(0)} · {p.overpricedBy}% above avg</div>
                </div>
                <Badge variant="outline" className="text-orange-400 border-orange-500/30 text-[10px] shrink-0">-{p.overpricedBy}%</Badge>
              </div>
            ))}
            {data.overpriced.length === 0 && <div className="text-sm text-muted-foreground p-4 text-center">✅ All products priced competitively</div>}
          </div>
        </div>

        <div>
          <SectionHeader icon={TrendingDown} title="AI Discount Suggestions" badge="Low conversion" />
          <div className="space-y-3">
            {data.discounts.slice(0, 4).map((d: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                {d.imageUrl && <img src={d.imageUrl} alt={d.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground">Rating {d.rating}/5 · Suggest -{d.suggestedDiscount}%</div>
                </div>
                <Badge variant="outline" className="text-blue-400 border-blue-500/30 text-[10px] shrink-0">-{d.suggestedDiscount}%</Badge>
              </div>
            ))}
            {data.discounts.length === 0 && <div className="text-sm text-muted-foreground p-4 text-center">✅ All products converting well</div>}
          </div>
        </div>
      </div>

      {/* Duplicate products */}
      {data.similar.length > 0 && (
        <div className="mt-8">
          <SectionHeader icon={Copy} title="Duplicate / Similar Product Groups" badge="Consolidation suggested" />
          <div className="grid md:grid-cols-2 gap-4">
            {data.similar.map((group: any, i: number) => (
              <div key={i} className="p-4 rounded-xl border bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">{group.group}</span>
                  <Badge variant="secondary" className="text-[10px]">{group.products.length} products</Badge>
                </div>
                <div className="flex flex-col gap-2">
                  {group.products.map((p: any, j: number) => (
                    <div key={j} className="flex items-center gap-2">
                      {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">${(p.price / 100).toFixed(0)} · ⭐ {p.rating}</div>
                      </div>
                      {j === 0 && <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">Primary</Badge>}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground border-t pt-2">{group.aiAction}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Inventory Tab ─────────────────────────────────────────────────────────────
function InventoryTab({ data }: { data: any }) {
  const critical = data.inventory.filter((i: any) => i.priority === "critical");
  const high = data.inventory.filter((i: any) => i.priority === "high");
  const normal = data.inventory.filter((i: any) => i.priority === "normal");

  return (
    <motion.div key="inventory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Critical Restock" value={critical.length} icon={AlertTriangle} color="" sub="< 7 days stock" />
        <StatCard label="High Priority" value={high.length} icon={Activity} color="" sub="< 14 days stock" />
        <StatCard label="Healthy Stock" value={normal.length} icon={CheckCircle2} color="" sub="No action needed" />
      </div>
      <SectionHeader icon={Package} title="AI Inventory Intelligence" badge="Auto-monitored" />
      <div className="space-y-3">
        {data.inventory.map((item: any, i: number) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`flex items-center gap-4 p-4 rounded-xl border bg-card ${item.priority === "critical" ? "border-red-500/30" : item.priority === "high" ? "border-yellow-500/30" : ""}`}
          >
            {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{item.name}</div>
              <div className="text-xs text-muted-foreground">{item.brand} · {item.category}</div>
              <div className="text-xs mt-1 text-muted-foreground">{item.aiRecommendation}</div>
            </div>
            <div className="text-right shrink-0 space-y-1">
              <div className="text-2xl font-bold">{item.stock}</div>
              <div className="text-[10px] text-muted-foreground">units left</div>
              <Badge
                variant="outline"
                className={`text-[10px] ${item.priority === "critical" ? "border-red-500/40 text-red-400" : item.priority === "high" ? "border-yellow-500/40 text-yellow-400" : "border-green-500/40 text-green-400"}`}
              >
                {item.priority === "critical" ? "🔴 CRITICAL" : item.priority === "high" ? "🟡 RESTOCK" : "🟢 OK"}
              </Badge>
            </div>
            <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.priority === "critical" ? "bg-red-500" : item.priority === "high" ? "bg-yellow-500" : "bg-green-500"}`}
                  style={{ width: `${Math.min(100, (item.stock / 80) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground">{item.daysUntilStockout}d remaining</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Bundles Tab ───────────────────────────────────────────────────────────────
function BundlesTab({ data }: { data: any }) {
  return (
    <motion.div key="bundles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
        <span className="font-semibold text-primary">AI Bundle Engine:</span> Automatically identifies complementary product pairs based on category relationships, user behavior patterns, and popularity scores. No human input required.
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {data.bundles.map((bundle: any, i: number) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="p-5 rounded-2xl border bg-card space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold">{bundle.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{bundle.reason}</div>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs shrink-0">
                Save ${(bundle.savings / 100).toFixed(0)}
              </Badge>
            </div>
            <div className="flex gap-3">
              {bundle.products.map((p: any, j: number) => (
                <div key={j} className="flex-1 p-3 rounded-xl bg-muted/40 flex flex-col items-center text-center gap-2">
                  {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-14 h-14 rounded-xl object-cover" />}
                  <div className="text-xs font-semibold line-clamp-2">{p.name}</div>
                  <div className="text-xs text-muted-foreground">${(p.price / 100).toFixed(0)}</div>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px]">{p.rating}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground">Bundle AI Score</div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${bundle.bundleScore}%` }} />
                </div>
                <span className="text-xs font-bold">{bundle.bundleScore}/100</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Reviews Tab ───────────────────────────────────────────────────────────────
function ReviewsTab({ data }: { data: any }) {
  const suspicious = data.reviews.filter((r: any) => r.isSuspicious);
  return (
    <motion.div key="reviews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Products Analyzed" value={data.reviews.length} icon={Eye} color="" sub="Full review scan" />
        <StatCard label="Suspicious Flagged" value={suspicious.length} icon={AlertTriangle} color="" sub="Needs verification" />
        <StatCard label="Authentic Reviews" value={data.reviews.length - suspicious.length} icon={Shield} color="" sub="Verified patterns" />
      </div>
      <SectionHeader icon={Shield} title="AI Review Intelligence" badge="Fake detection active" />
      <div className="space-y-3">
        {data.reviews.map((r: any, i: number) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`p-4 rounded-xl border bg-card ${r.isSuspicious ? "border-orange-500/30 bg-orange-500/5" : ""}`}
          >
            <div className="flex items-start gap-3">
              {r.imageUrl && <img src={r.imageUrl} alt={r.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{r.name}</span>
                  <Badge variant="outline" className="text-[10px]">{r.brand}</Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${r.isSuspicious ? "border-orange-500/40 text-orange-400" : "border-green-500/40 text-green-400"}`}
                  >
                    {r.isSuspicious ? "⚠️ Suspicious" : "✅ Authentic"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>⭐ {r.rating}/5</span>
                  <span>{r.reviewCount.toLocaleString()} reviews</span>
                  <span className="font-medium text-foreground">{r.sentiment}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{r.aiVerdict}</div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <div className="text-[10px] text-green-500 font-semibold mb-1">POSITIVES</div>
                    {r.topPositives.map((p: string, j: number) => (
                      <div key={j} className="text-[11px] text-muted-foreground flex items-start gap-1">
                        <span className="text-green-500">+</span>{p}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[10px] text-red-500 font-semibold mb-1">CONCERNS</div>
                    {r.topNegatives.map((n: string, j: number) => (
                      <div key={j} className="text-[11px] text-muted-foreground flex items-start gap-1">
                        <span className="text-red-500">-</span>{n}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold">{r.suspiciousScore}</div>
                <div className="text-[10px] text-muted-foreground">risk score</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Trends Tab ────────────────────────────────────────────────────────────────
function TrendsTab({ data }: { data: any }) {
  const t = data.trends;
  const maxScore = Math.max(...t.topCategories.map((c: any) => c.score), 1);

  return (
    <motion.div key="trends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="AI Recommendations" value={t.totalRecommendations} icon={Bot} color="" sub="Autonomous" />
        <StatCard label="Cart Actions" value={t.totalCartActions} icon={ShoppingCart} color="" sub="Tracked" />
        <StatCard label="Wishlist Items" value={t.totalWishlistItems} icon={Star} color="" sub="Saved" />
        <StatCard label="Trending Category" value={t.topCategories[0]?.category || "—"} icon={Flame} color="" sub="Most active" />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <SectionHeader icon={BarChart3} title="Category Demand Analysis" />
          <div className="space-y-3">
            {t.topCategories.map((c: any, i: number) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.category}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${c.trend === "rising" ? "border-green-500/40 text-green-400" : c.trend === "declining" ? "border-red-500/40 text-red-400" : "border-muted-foreground/40 text-muted-foreground"}`}
                    >
                      {c.trend === "rising" ? <ArrowUp className="w-2.5 h-2.5 inline mr-0.5" /> : c.trend === "declining" ? <ArrowDown className="w-2.5 h-2.5 inline mr-0.5" /> : <Minus className="w-2.5 h-2.5 inline mr-0.5" />}
                      {c.trend}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{c.score}pts</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(c.score / maxScore) * 100}%` }}
                    transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionHeader icon={Flame} title="Hot Products (AI Engagement)" />
          <div className="space-y-3">
            {t.hotProducts.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                  {i + 1}
                </div>
                {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.category}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold">{p.engagementScore}</div>
                  <div className="text-[10px] text-muted-foreground">score</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {t.priceTrends.length > 0 && (
        <div>
          <SectionHeader icon={TrendingDown} title="AI Price Drop Tracker" />
          <div className="grid md:grid-cols-2 gap-3">
            {t.priceTrends.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                <TrendingDown className="w-4 h-4 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.category} · ${(p.price / 100).toFixed(0)}</div>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] shrink-0">
                  -{p.discountPct}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab({ data }: { data: any }) {
  const u = data.userInsights;
  return (
    <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="User Sessions" value={u.totalSessions} icon={Users} color="" sub="AI-tracked profiles" />
        <StatCard label="Avg Budget" value={`$${(u.avgBudget / 100).toFixed(0)}`} icon={Tag} color="" sub="Per session" />
        <StatCard label="Engagement Rate" value={`${u.engagementRate}%`} icon={Activity} color="" sub="AI interaction depth" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <SectionHeader icon={Brain} title="AI-Generated User Insights" />
          <div className="space-y-2">
            {u.aiInsights.map((insight: string, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-2.5 p-3 rounded-xl border bg-card text-sm"
              >
                <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                {insight}
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <SectionHeader icon={Users} title="Shopper Behavior Segments" />
          <div className="space-y-4">
            {u.behaviorSegments.map((seg: any, i: number) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{seg.segment}</span>
                  <span className="font-bold text-primary">{seg.pct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${seg.pct}%` }}
                    transition={{ delay: i * 0.15, duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
                <div className="text-xs text-muted-foreground">{seg.description}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="text-xs font-semibold text-primary mb-2">AI PREDICTION</div>
            <div className="text-sm text-muted-foreground">
              Based on current behavior patterns, <span className="text-foreground font-medium">{u.topPreferredCategory}</span> will remain the top-performing category for the next 30 days. AI recommends increasing inventory and featured slots for this category.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
