import { useLocation } from "wouter";
import { useAiCompare } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Bot, Check, ShieldCheck, Trophy, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/product-card";
import { cn } from "@/lib/utils";

export default function Compare() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const idsParam = searchParams.get("ids");
  const productIds = idsParam ? idsParam.split(",").map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : [];

  const compare = useAiCompare();
  const [hasCompared, setHasCompared] = useState(false);

  useEffect(() => {
    if (productIds.length >= 2 && !hasCompared && !compare.isPending && !compare.data) {
      setHasCompared(true);
      compare.mutate({ data: { productIds } });
    }
  }, [productIds, hasCompared]);

  if (productIds.length < 2) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <ShieldCheck className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Not enough products to compare</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Select at least two products from the catalog to run an AI comparison.
        </p>
        <Button onClick={() => window.location.href = "/products"}>Back to Catalog</Button>
      </div>
    );
  }

  if (compare.isPending) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center space-y-8">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
          <div className="w-24 h-24 rounded-full bg-ai-gradient flex items-center justify-center relative z-10 ai-glow">
            <Bot className="w-12 h-12 text-white animate-pulse" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2 text-ai-gradient ai-glow-text">AI is running comparison...</h2>
          <p className="text-muted-foreground">Analyzing specs, prices, and reviews side-by-side.</p>
        </div>
        <div className="flex gap-4 justify-center w-full max-w-3xl">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-64 w-1/2 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const result = compare.data;

  if (!result) return null;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex items-center gap-3 mb-10">
        <div className="p-2 rounded-lg bg-ai-gradient text-white">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">AI Comparison Results</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Winner Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="bg-card border-2 border-primary/50 rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 relative">
              <div className="absolute top-0 left-0 w-full bg-primary text-primary-foreground py-2 px-4 flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm z-10">
                <Trophy className="w-4 h-4" /> AI Choice Winner
              </div>
              <div className="pt-10">
                <ProductCard product={result.winner} />
              </div>
            </div>
          </div>
        </div>

        {/* Analysis */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card border rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary" /> The Verdict
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              {result.analysis}
            </p>
            <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary-foreground/90 font-medium">
              {result.recommendation}
            </div>
          </div>

          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="p-6 border-b bg-muted/30">
              <h2 className="text-xl font-bold">Feature Comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Aspect</th>
                    {Object.keys(result.comparisonTable[0]?.scores || {}).map(key => (
                      <th key={key} className="px-6 py-4 font-medium capitalize">
                        {key === result.winner.id.toString() ? 'Winner' : `Product ${key}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y border-t">
                  {result.comparisonTable.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{row.aspect}</td>
                      {Object.entries(row.scores).map(([productId, score]) => (
                        <td key={productId} className={cn(
                          "px-6 py-4",
                          productId === result.winner.id.toString() ? "font-bold text-primary bg-primary/5" : "text-muted-foreground"
                        )}>
                          {String(score)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
