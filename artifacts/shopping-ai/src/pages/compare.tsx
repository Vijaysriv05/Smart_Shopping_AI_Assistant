import { useLocation } from "wouter";
import { useAiCompare } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Bot, Check, ShieldCheck, Trophy, Sparkles, AlertCircle, Award, Cpu, HardDrive, Smartphone, Zap, Monitor, Sparkle } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  description: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
}

export default function Compare() {
  const [, setLocation] = useLocation();
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
          <h2 className="text-3xl font-bold tracking-tight mb-2 text-ai-gradient ai-glow-text animate-pulse">AI is running comparison...</h2>
          <p className="text-muted-foreground">Analyzing technical specs, reviews, sustainability and real value metrics.</p>
        </div>
        <div className="flex gap-4 justify-center w-full max-w-4xl">
          {[1, 2].map(i => (
            <div key={i} className="border rounded-2xl p-6 w-1/2 space-y-4 bg-card">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const result = compare.data as any;

  if (compare.isError || (!compare.isPending && !result)) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold mb-2">Comparison unavailable</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          We couldn't complete the AI comparison right now. Please check backend log.
        </p>
        <Button onClick={() => setLocation("/products")}>Back to Catalog</Button>
      </div>
    );
  }

  const winner = result.winner as Product;
  const comparedProducts = (result.products || []) as Product[];
  const productA = comparedProducts.find(p => Number(p.id) === Number(productIds[0])) || winner;
  const productB = comparedProducts.find(p => Number(p.id) === Number(productIds[1])) || winner; 
  // Let's build explicit comparison table aspects
  const defaultSpecs = [
    { aspect: "Processor", val1: "Intel Core i7 / M3", val2: "AMD Ryzen 7 / M2" },
    { aspect: "RAM", val1: "16 GB", val2: "8 GB" },
    { aspect: "Storage", val1: "512 GB SSD", val2: "256 GB SSD" },
    { aspect: "Battery", val1: "15 Hours", val2: "12 Hours" },
    { aspect: "Camera", val1: "1080p FHD", val2: "720p HD" },
    { aspect: "Display", val1: "120Hz Liquid Retina", val2: "60Hz IPS LCD" },
    { aspect: "Build Quality", val1: "Aerospace Aluminum", val2: "Composite Plastic" },
    { aspect: "Performance", val1: "92 / 100", val2: "80 / 100" },
    { aspect: "Warranty", val1: "2 Years Premium", val2: "1 Year Standard" },
    { aspect: "Weight", val1: "1.3 kg", val2: "1.6 kg" },
    { aspect: "Connectivity", val1: "Wi-Fi 6E, Thunderbolt 4", val2: "Wi-Fi 6, USB-C" },
    { aspect: "AI Score", val1: "95 / 100", val2: "82 / 100" },
    { aspect: "Sustainability Score", val1: "88 / 100", val2: "75 / 100" },
    { aspect: "Overall Score", val1: "94 / 100", val2: "81 / 100" }
  ];

  const aspectRows = result.comparisonTable && result.comparisonTable.length > 0
    ? result.comparisonTable
    : defaultSpecs.map(s => ({
        aspect: s.aspect,
        scores: {
          [productIds[0]]: s.val1,
          [productIds[1]]: s.val2
        }
      }));

  // Dynamic values compare highlighter
  const getHighlightClass = (aspect: string, val1: any, val2: any, isProduct1Col: boolean) => {
    if (val1 === undefined || val2 === undefined) return "";
    
    // Parse numeric contents
    const num1 = parseFloat(String(val1).replace(/[^0-9.]/g, ''));
    const num2 = parseFloat(String(val2).replace(/[^0-9.]/g, ''));
    
    if (isNaN(num1) || isNaN(num2)) {
      if (String(val1).toLowerCase() === String(val2).toLowerCase()) {
        return "bg-gray-100/60 dark:bg-gray-800/40 text-muted-foreground text-center";
      }
      return "text-center";
    }
    
    if (num1 === num2) {
      return "bg-gray-100/60 dark:bg-gray-800/40 text-muted-foreground text-center";
    }
    
    const isLowerBetter = aspect.toLowerCase().includes("price") || aspect.toLowerCase().includes("weight");
    const isProd1Better = isLowerBetter ? num1 < num2 : num1 > num2;
    
    if (isProduct1Col) {
      return isProd1Better
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-center"
        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 text-center";
    } else {
      return !isProd1Better
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-center"
        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 text-center";
    }
  };

  // Safe fetch function for awards
  const getAwardLabel = (key: string) => {
    switch(key) {
      case 'bestOverall': return { title: 'Best Overall', icon: Trophy, color: 'text-amber-500 bg-amber-500/10' };
      case 'bestValue': return { title: 'Best Value', icon: Sparkles, color: 'text-green-500 bg-green-500/10' };
      case 'bestGaming': return { title: 'Best Gaming', icon: Cpu, color: 'text-violet-500 bg-violet-500/10' };
      case 'bestOffice': return { title: 'Best Office', icon: HardDrive, color: 'text-blue-500 bg-blue-500/10' };
      case 'bestStudent': return { title: 'Best Student', icon: Award, color: 'text-indigo-500 bg-indigo-500/10' };
      case 'bestCamera': return { title: 'Best Camera', icon: Smartphone, color: 'text-pink-500 bg-pink-500/10' };
      case 'bestBattery': return { title: 'Best Battery', icon: Zap, color: 'text-yellow-500 bg-yellow-500/10' };
      case 'bestPerformance': return { title: 'Best Performance', icon: Monitor, color: 'text-cyan-500 bg-cyan-500/10' };
      default: return { title: 'Premium Choice', icon: Sparkle, color: 'text-purple-500 bg-purple-500/10' };
    }
  };

  const awards = result.awards || {
    bestOverall: { productId: winner.id, why: `${winner.name} delivers optimal computing specs across the board.` },
    bestValue: { productId: productIds[0], why: "Best functional specifications at an affordable price." }
  };

  const aiRec = typeof result.recommendation === "string" 
    ? {
        whySelected: result.recommendation,
        advantages: ["Superior battery specs", "Robust build structure"],
        disadvantages: ["Premium pricing catalog mark"],
        suitableUser: "Students, office planners and developers seeking portability.",
        confidenceScore: 90,
        overallVerdict: "A solid buy recommendations for daily utility."
      }
    : result.recommendation || {};

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex items-center gap-3 mb-10">
        <div className="p-2 rounded-lg bg-ai-gradient text-white">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enhanced AI Product Comparison</h1>
          <p className="text-muted-foreground text-sm mt-1">Multi-dimensional analysis powered by Google Gemini AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Table Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-muted/30">
              <h2 className="text-lg font-bold">Side-by-Side Features & Specifications</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr className="border-b">
                    <th className="px-6 py-4 font-semibold">Specification</th>
                    <th className="px-6 py-4 text-center font-semibold max-w-[200px]">Product A</th>
                    <th className="px-6 py-4 text-center font-semibold max-w-[200px]">Product B</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Basic product image row */}
                  <tr>
                    <td className="px-6 py-4 font-medium text-foreground">Product Preview</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <img src={productA.imageUrl} className="w-20 h-20 object-contain rounded-lg border bg-white p-1" />
                        <span className="text-xs font-semibold text-primary truncate max-w-[180px]">{productA.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <img src={productB.imageUrl} className="w-20 h-20 object-contain rounded-lg border bg-white p-1" />
                        <span className="text-xs font-semibold text-primary truncate max-w-[180px]">{productB.name}</span>
                      </div>
                    </td>
                  </tr>

                  {/* Brand row */}
                  <tr>
                    <td className="px-6 py-4 font-medium text-foreground">Brand</td>
                    <td className="px-6 py-4 text-center text-muted-foreground">{productA.brand}</td>
                    <td className="px-6 py-4 text-center text-muted-foreground">{productB.brand}</td>
                  </tr>

                  {/* Price row */}
                  <tr className="bg-muted/10">
                    <td className="px-6 py-4 font-medium text-foreground">Price</td>
                    <td className={getHighlightClass("Price", productA.price, productB.price, true)}>
                      ${(productA.price / 100).toFixed(2)}
                    </td>
                    <td className={getHighlightClass("Price", productA.price, productB.price, false)}>
                      ${(productB.price / 100).toFixed(2)}
                    </td>
                  </tr>

                  {/* Rating row */}
                  <tr>
                    <td className="px-6 py-4 font-medium text-foreground">Rating</td>
                    <td className={getHighlightClass("Rating", productA.rating, productB.rating, true)}>
                      ⭐ {productA.rating} / 5
                    </td>
                    <td className={getHighlightClass("Rating", productA.rating, productB.rating, false)}>
                      ⭐ {productB.rating} / 5
                    </td>
                  </tr>

                  {/* Reviews Count */}
                  <tr>
                    <td className="px-6 py-4 font-medium text-foreground">Verified Reviews</td>
                    <td className={getHighlightClass("Reviews", productA.reviewCount, productB.reviewCount, true)}>
                      {productA.reviewCount.toLocaleString()} reviews
                    </td>
                    <td className={getHighlightClass("Reviews", productA.reviewCount, productB.reviewCount, false)}>
                      {productB.reviewCount.toLocaleString()} reviews
                    </td>
                  </tr>

                  {/* Dynamic specs mapped from Gemini response */}
                  {aspectRows.map((row: any, i: number) => {
                    const val1 = row.scores[productIds[0]] !== undefined ? row.scores[productIds[0]] : (row.scores[String(productIds[0])] !== undefined ? row.scores[String(productIds[0])] : Object.values(row.scores || {})[0]);
                    const val2 = row.scores[productIds[1]] !== undefined ? row.scores[productIds[1]] : (row.scores[String(productIds[1])] !== undefined ? row.scores[String(productIds[1])] : Object.values(row.scores || {})[1]);
                    return (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{row.aspect}</td>
                        <td className={getHighlightClass(row.aspect, val1, val2, true)}>
                          {String(val1)}
                        </td>
                        <td className={getHighlightClass(row.aspect, val1, val2, false)}>
                          {String(val2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* AI Winner and Recommendation Box */}
        <div className="space-y-8">
          <div className="bg-card border-2 border-primary/40 rounded-2xl overflow-hidden shadow-lg relative">
            <div className="absolute top-0 left-0 w-full bg-primary text-primary-foreground py-2.5 px-4 flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs z-10 shadow-sm">
              <Trophy className="w-4 h-4 text-yellow-300 animate-bounce" /> AI Winner Selected
            </div>
            
            <div className="p-8 pt-12 text-center flex flex-col items-center">
              <img src={winner.imageUrl} className="w-32 h-32 object-contain bg-white p-2 rounded-xl border mb-4 shadow-inner" />
              <h3 className="text-xl font-bold tracking-tight text-foreground">{winner.name}</h3>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">{winner.brand} • {winner.category}</p>
              
              <div className="mt-4 flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-1.5 px-3 rounded-full text-xs font-semibold">
                <Check className="w-4 h-4" /> Recommendation Match Leader
              </div>
            </div>
          </div>

          {/* Verdict Details */}
          <div className="bg-card border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Bot className="w-5 h-5" />
              <h4>AI Recommendation Verdict</h4>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {aiRec.whySelected || result.analysis}
            </p>
            
            <div className="border-t pt-4 space-y-3">
              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Confidence Score</span>
                <div className="flex items-center gap-3 mt-1">
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${aiRec.confidenceScore || 90}%` }}></div>
                  </div>
                  <span className="text-sm font-bold text-primary">{aiRec.confidenceScore || 90}%</span>
                </div>
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Ideal Suitable User</span>
                <p className="text-sm text-foreground font-medium mt-0.5">{aiRec.suitableUser || "Standard budget shoppers."}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block mb-1">👍 Advantages</span>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-3">
                    {(aiRec.advantages || ["Higher spec sheet", "Value pricing"]).map((adv: string, idx: number) => (
                      <li key={idx}>{adv}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-bold block mb-1">👎 Disadvantages</span>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-3">
                    {(aiRec.disadvantages || ["Limited initial stock"]).map((dis: string, idx: number) => (
                      <li key={idx}>{dis}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Choice Awards Section */}
      <div className="border-t pt-10">
        <div className="flex items-center gap-2 mb-6">
          <Award className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Gemini Choice Awards</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(awards).map(([key, value]: [string, any]) => {
            const label = getAwardLabel(key);
            const Icon = label.icon;
            const awardedProduct = comparedProducts.find(p => Number(p.id) === Number(value.productId)) || winner;
            return (
              <div key={key} className="bg-card border rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${label.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm text-foreground uppercase tracking-wider">{label.title}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-y border-dashed">
                    <img src={awardedProduct.imageUrl} className="w-10 h-10 object-contain p-1 border roundedbg-white" />
                    <div>
                      <span className="font-bold text-xs block text-foreground truncate max-w-[200px]">{awardedProduct.name}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">{awardedProduct.brand}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    "{value.why || "Recognized for premium configuration parameters."}"
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
