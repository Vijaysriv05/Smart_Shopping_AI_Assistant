import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, X, Send, Sparkles, Zap, ShoppingCart, Heart, Search,
  TrendingUp, Package, Star, ChevronRight, Maximize2, Minimize2,
  RefreshCw, Mic, Copy, CheckCheck, ExternalLink, Tag
} from "lucide-react";
import { useAiRecommend } from "@workspace/api-client-react";
import { useAddToCart, useAddToWishlist, getGetCartQueryKey, getGetWishlistQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";

type MessageProduct = {
  id: number;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number | null;
  imageUrl?: string | null;
  rating?: number | null;
  category?: string;
  aiScore?: number | null;
};

type ProductRec = {
  product: MessageProduct;
  score: number;
  rank: number;
  why: string;
};

type Message = {
  role: "user" | "ai";
  content: string;
  products?: ProductRec[];
  accessories?: string[];
  budgetAdvice?: string | null;
  followUpQuestions?: string[];
  isTyping?: boolean;
  timestamp?: Date;
  action?: "navigate" | "search" | "compare";
  actionTarget?: string;
};

type Suggestion = { label: string; query: string; icon: React.ReactNode };

function AiFeedbackBox({ productId }: { productId: number }) {
  const [submitted, setSubmitted] = useState(false);
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (isHelpful === null) return;
    setLoading(true);
    fetch("/api/ai/feedback", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-session-id": getSessionId()
      },
      body: JSON.stringify({ productId, isHelpful, rating, comment })
    })
      .then(res => res.json())
      .then(() => {
        setSubmitted(true);
        setLoading(false);
      })
      .catch(err => {
        console.error("Feedback submit error:", err);
        setLoading(false);
      });
  };

  if (submitted) {
    return (
      <div className="text-[10px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 p-2 rounded-xl text-center font-bold">
        ✓ Feedback recorded! Thanks for helping Goval AI improve.
      </div>
    );
  }

  return (
    <div className="bg-muted/40 p-2.5 rounded-xl border space-y-2 mt-2 text-[10px]">
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Was this recommendation helpful?</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setIsHelpful(true)}
            className={`px-2 py-0.5 rounded border transition-colors ${
              isHelpful === true ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "hover:bg-muted"
            }`}
          >
            👍 Yes
          </button>
          <button
            onClick={() => setIsHelpful(false)}
            className={`px-2 py-0.5 rounded border transition-colors ${
              isHelpful === false ? "bg-rose-500/20 text-rose-400 border-rose-500/40" : "hover:bg-muted"
            }`}
          >
            👎 No
          </button>
        </div>
      </div>

      {isHelpful !== null && (
        <div className="space-y-1.5 border-t pt-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span>Rating (1-5):</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-xs ${star <= rating ? "text-amber-400" : "text-muted-foreground"}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <input
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add comment..."
            className="w-full bg-muted border rounded p-1 text-[10px] focus:outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-1 rounded"
          >
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      )}
    </div>
  );
}


const PAGE_CONTEXT: Record<string, { title: string; subtitle: string; suggestions: Suggestion[] }> = {
  "/": {
    title: "AI Shopping Expert",
    subtitle: "I analyze, compare & find deals for you",
    suggestions: [
      { label: "Best laptop under $1000", query: "Best laptop for students under 100000 cents", icon: <Sparkles className="w-3 h-3" /> },
      { label: "Top running shoes", query: "Best running shoes for marathon training", icon: <Zap className="w-3 h-3" /> },
      { label: "Gift ideas under $50", query: "Best gift ideas under 5000 cents", icon: <Tag className="w-3 h-3" /> },
      { label: "Best smartphone", query: "Best budget smartphone with best camera", icon: <Star className="w-3 h-3" /> },
    ],
  },
  "/products": {
    title: "Smart Product Filter",
    subtitle: "Ask me to filter and find exactly what you need",
    suggestions: [
      { label: "Highest rated", query: "Show me top rated products with 4.5+ stars", icon: <Star className="w-3 h-3" /> },
      { label: "Best deals today", query: "Best value for money products with biggest discounts", icon: <Tag className="w-3 h-3" /> },
      { label: "New arrivals", query: "Latest products released recently", icon: <Sparkles className="w-3 h-3" /> },
      { label: "Compare top picks", query: "Compare the best products across all categories", icon: <TrendingUp className="w-3 h-3" /> },
    ],
  },
  "/agent": {
    title: "AI Search Mode",
    subtitle: "Describe what you need — I'll find it",
    suggestions: [
      { label: "Developer laptop", query: "Best laptop for Python and AI development under $1500", icon: <Zap className="w-3 h-3" /> },
      { label: "Noise-cancelling audio", query: "Best noise cancelling headphones for office under $300", icon: <Star className="w-3 h-3" /> },
      { label: "Home gym setup", query: "Complete home gym equipment setup under $500", icon: <TrendingUp className="w-3 h-3" /> },
      { label: "Skincare routine", query: "Best skincare products for daily routine", icon: <Sparkles className="w-3 h-3" /> },
    ],
  },
  "/compare": {
    title: "Comparison Assistant",
    subtitle: "I'll help you pick the right products to compare",
    suggestions: [
      { label: "Top 3 laptops", query: "Best 3 laptops to compare for purchase right now", icon: <Package className="w-3 h-3" /> },
      { label: "Best smartphones", query: "Best 3 smartphones to compare right now", icon: <Package className="w-3 h-3" /> },
      { label: "Headphones battle", query: "Top 3 headphones for music lovers to compare", icon: <Package className="w-3 h-3" /> },
      { label: "Fitness gear", query: "Best fitness equipment for home gym to compare", icon: <Package className="w-3 h-3" /> },
    ],
  },
  "/dashboard": {
    title: "Personal Insights",
    subtitle: "I've analyzed your shopping patterns",
    suggestions: [
      { label: "Wishlist analysis", query: "Analyze my saved products and suggest best buy", icon: <Heart className="w-3 h-3" /> },
      { label: "Budget optimizer", query: "How can I save money on my current shopping list", icon: <Tag className="w-3 h-3" /> },
      { label: "Price alerts", query: "Which products have dropped in price recently", icon: <TrendingUp className="w-3 h-3" /> },
      { label: "Smart upgrades", query: "Suggest upgrades based on my shopping history", icon: <Sparkles className="w-3 h-3" /> },
    ],
  },
  "/cart": {
    title: "Cart Advisor",
    subtitle: "I can optimize your current cart",
    suggestions: [
      { label: "Better alternatives", query: "Are there cheaper alternatives to what's in my cart", icon: <Tag className="w-3 h-3" /> },
      { label: "Bundle savings", query: "Which products in my cart can be bundled for savings", icon: <Sparkles className="w-3 h-3" /> },
      { label: "Checkout ready?", query: "Is now a good time to buy or should I wait for deals", icon: <TrendingUp className="w-3 h-3" /> },
      { label: "Add-ons", query: "What accessories should I add to complete my purchase", icon: <Package className="w-3 h-3" /> },
    ],
  },
};

function getPageContext(location: string) {
  if (location.startsWith("/products/")) {
    return {
      title: "Product Analyzer",
      subtitle: "Ask me anything about this product",
      suggestions: [
        { label: "Find similar", query: "Find similar products at a lower price", icon: <Search className="w-3 h-3" /> },
        { label: "Better value?", query: "Is there a better alternative for less money", icon: <Tag className="w-3 h-3" /> },
        { label: "Accessories", query: "What accessories do I need with this product", icon: <Package className="w-3 h-3" /> },
        { label: "Price trend", query: "Will this product get cheaper soon or should I buy now", icon: <TrendingUp className="w-3 h-3" /> },
      ],
    };
  }
  return PAGE_CONTEXT[location] || PAGE_CONTEXT["/"];
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-violet-400"
          animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function ProductMiniCard({
  rec,
  onAddToCart,
  onAddToWishlist,
}: {
  rec: ProductRec;
  onAddToCart: (id: number) => void;
  onAddToWishlist: (id: number) => void;
}) {
  const hasDiscount =
    rec.product.originalPrice != null && rec.product.originalPrice > rec.product.price;
  const discountPct = hasDiscount
    ? Math.round(
        ((rec.product.originalPrice! - rec.product.price) / rec.product.originalPrice!) * 100
      )
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card/80 overflow-hidden hover:border-violet-500/40 transition-all group"
    >
      <div className="flex items-start gap-2 p-2.5">
        {/* Rank badge */}
        <div className="shrink-0 w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
          {rec.rank}
        </div>

        {/* Image */}
        <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted relative">
          {rec.product.imageUrl ? (
            <img
              src={rec.product.imageUrl}
              alt={rec.product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
              {rec.product.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          {hasDiscount && (
            <div className="absolute top-0 left-0 bg-green-500 text-white text-[8px] font-bold px-1 rounded-br">
              -{discountPct}%
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide truncate">
            {rec.product.brand}
          </div>
          <div className="text-xs font-semibold leading-tight truncate mt-0.5">
            {rec.product.name}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs font-bold text-violet-400">
              ${(rec.product.price / 100).toFixed(0)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] line-through text-muted-foreground">
                ${(rec.product.originalPrice! / 100).toFixed(0)}
              </span>
            )}
            {rec.product.rating && (
              <span className="ml-auto text-[10px] text-yellow-500 flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-current" /> {rec.product.rating.toFixed(1)}
              </span>
            )}
          </div>
          {/* AI score bar */}
          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${rec.score}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">AI Score: {rec.score}/100</div>
        </div>
      </div>

      {/* Why */}
      {rec.why && (
        <div className="px-2.5 pb-1.5 text-[10px] text-muted-foreground leading-relaxed line-clamp-2 border-t pt-1.5">
          {rec.why}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1.5 px-2.5 pb-2.5">
        <button
          onClick={() => onAddToCart(rec.product.id)}
          className="flex-1 flex items-center justify-center gap-1 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-semibold py-1.5 rounded-lg transition-colors"
        >
          <ShoppingCart className="w-2.5 h-2.5" /> Add to Cart
        </button>
        <button
          onClick={() => onAddToWishlist(rec.product.id)}
          className="w-7 flex items-center justify-center border hover:border-rose-500 hover:text-rose-500 rounded-lg transition-colors"
        >
          <Heart className="w-3 h-3" />
        </button>
        <a
          href={`/products/${rec.product.id}`}
          className="w-7 flex items-center justify-center border hover:border-violet-500 hover:text-violet-500 rounded-lg transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </motion.div>
  );
}

function StreamingText({ text, speed = 15 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  const copyText = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/text">
      <p className="text-xs leading-relaxed whitespace-pre-wrap">
        {displayed}
        {!done && <span className="inline-block w-0.5 h-3 bg-violet-400 ml-0.5 animate-pulse" />}
      </p>
      {done && (
        <button
          onClick={copyText}
          className="absolute top-0 right-0 opacity-0 group-hover/text:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
        >
          {copied ? (
            <CheckCheck className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      )}
    </div>
  );
}

export function FloatingAI() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState("");
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const recommend = useAiRecommend();
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sessionId = getSessionId();
  const context = getPageContext(location);

  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();

  const thinkingSteps = [
    "🔍 Scanning product catalog...",
    "🧠 Analyzing your preferences...",
    "⚡ Running price intelligence...",
    "📊 Evaluating specs and reviews...",
    "🎯 Ranking by relevance...",
    "✨ Crafting recommendation...",
  ];

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    setMessages([]);
  }, [location]);

  const handleAddToCart = useCallback(
    (productId: number) => {
      addToCart.mutate(
        { data: { productId, quantity: 1, sessionId } },
        {
          onSuccess: () => {
            toast({ title: "✅ Added to cart!", description: "Item added successfully." });
            queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          },
        }
      );
    },
    [addToCart, sessionId, toast, queryClient]
  );

  const handleAddToWishlist = useCallback(
    (productId: number) => {
      addToWishlist.mutate(
        { data: { productId, sessionId } },
        {
          onSuccess: () => {
            toast({ title: "❤️ Saved!", description: "Added to your wishlist." });
            queryClient.invalidateQueries({ queryKey: getGetWishlistQueryKey() });
          },
        }
      );
    },
    [addToWishlist, sessionId, toast, queryClient]
  );

  const handleSend = useCallback(
    (query: string) => {
      if (!query.trim() || isThinking) return;
      const q = query.trim();
      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: q, timestamp: new Date() }]);
      setIsThinking(true);

      // Cycle through thinking steps
      let stepIdx = 0;
      setThinkingStep(thinkingSteps[0]);
      const stepInterval = setInterval(() => {
        stepIdx = (stepIdx + 1) % thinkingSteps.length;
        setThinkingStep(thinkingSteps[stepIdx]);
      }, 700);

      recommend.mutate(
        {
          data: {
            query: q,
            conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
          },
        },
        {
          onSuccess: (data) => {
            clearInterval(stepInterval);
            setIsThinking(false);
            setMessages((prev) => [
              ...prev,
              {
                role: "ai",
                content: data.reasoning || "Here are my top picks for you:",
                products: (data.products as ProductRec[])?.slice(0, 3),
                accessories: data.accessories,
                budgetAdvice: data.budgetAdvice,
                followUpQuestions: (data as any).followUpQuestions?.slice(0, 2),
                timestamp: new Date(),
              },
            ]);
          },
          onError: () => {
            clearInterval(stepInterval);
            setIsThinking(false);
            setMessages((prev) => [
              ...prev,
              {
                role: "ai",
                content:
                  "I had trouble processing that. Could you try rephrasing with a specific product type or budget? For example: \"Best laptop under $1000\" or \"Headphones for gym\".",
                timestamp: new Date(),
              },
            ]);
          },
        }
      );
    },
    [isThinking, messages, recommend]
  );

  const panelWidth = expanded ? "w-[520px]" : "w-[380px]";
  const panelMaxHeight = expanded ? "min(85vh, 800px)" : "min(600px, calc(100vh - 96px))";

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 text-white shadow-2xl shadow-violet-500/50 flex items-center justify-center ring-2 ring-violet-400/40 hover:shadow-violet-500/70 transition-shadow"
          >
            <Bot className="w-8 h-8" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-background animate-pulse" />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-violet-400/30"
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", damping: 22, stiffness: 220 }}
            className={`fixed bottom-6 right-6 z-50 ${panelWidth} max-w-[calc(100vw-24px)] rounded-2xl bg-card border border-border/60 shadow-2xl shadow-black/40 flex flex-col overflow-hidden`}
            style={{ maxHeight: panelMaxHeight }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-700/95 to-blue-700/95 backdrop-blur-sm border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-violet-700 animate-pulse" />
                </div>
                <div>
                  <div className="text-white font-bold text-sm leading-none">AI Shopping Agent</div>
                  <div className="text-white/60 text-[10px] mt-0.5">
                    {isThinking ? (
                      <span className="text-green-300 animate-pulse">{thinkingStep}</span>
                    ) : (
                      <span>{context.subtitle}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                  title={expanded ? "Minimize" : "Expand"}
                >
                  {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setMessages([])}
                  className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                  title="Clear chat"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 scrollbar-thin">
              {/* Welcome state */}
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  {/* AI greeting */}
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 shadow-lg">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-muted/60 rounded-2xl rounded-tl-sm p-3 text-sm border border-border/40 backdrop-blur-sm">
                      <p className="font-bold text-sm mb-1 bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                        {context.title}
                      </p>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        I use Gemini AI to analyze products, compare prices, and find the best deals for you. Try me!
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {["🔍 Search", "💰 Compare prices", "🛒 Add to cart", "❤️ Save products"].map(tag => (
                          <span key={tag} className="text-[10px] bg-violet-500/10 text-violet-400 rounded-full px-2 py-0.5 border border-violet-500/20">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick suggestions */}
                  <div className="pl-9">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-semibold">
                      Try asking
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {context.suggestions.map((s, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07 }}
                          onClick={() => handleSend(s.query)}
                          className="text-left text-xs p-2.5 rounded-xl border bg-card/60 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all flex items-start gap-1.5 group"
                        >
                          <span className="text-violet-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                            {s.icon}
                          </span>
                          <span className="leading-tight">{s.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}
                >
                  {msg.role === "ai" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-violet-500/30">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className="max-w-[88%] space-y-2">
                    {msg.role === "user" ? (
                      <div className="bg-gradient-to-br from-violet-600 to-blue-600 text-white px-3 py-2 rounded-2xl rounded-tr-sm text-xs leading-relaxed shadow-lg">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="bg-muted/50 border border-border/40 px-3 py-2.5 rounded-2xl rounded-tl-sm">
                        <StreamingText text={msg.content} />
                      </div>
                    )}

                    {/* Budget Advice */}
                    {msg.budgetAdvice && (
                      <div className="flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-2.5 py-2 text-[10px] text-amber-400">
                        <Tag className="w-3 h-3 mt-0.5 shrink-0" />
                        {msg.budgetAdvice}
                      </div>
                    )}

                    {/* Product Recommendations */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-violet-400" />
                          AI Picks ({msg.products.length})
                        </div>
                        {msg.products.map((rec) => (
                          <ProductMiniCard
                            key={rec.product.id}
                            rec={rec}
                            onAddToCart={handleAddToCart}
                            onAddToWishlist={handleAddToWishlist}
                          />
                        ))}
                        {msg.role === "ai" && msg.products && msg.products.length > 0 && (
                          <AiFeedbackBox productId={msg.products[0].product.id} />
                        )}
                      </div>
                    )}

                    {/* Accessories */}
                    {msg.accessories && msg.accessories.length > 0 && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-2.5 py-2">
                        <div className="text-[10px] font-semibold text-blue-400 mb-1 flex items-center gap-1">
                          <Package className="w-3 h-3" /> Also consider
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {msg.accessories.slice(0, 4).map((a, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-full px-2 py-0.5"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up questions */}
                    {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                      <div className="space-y-1">
                        {msg.followUpQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(q)}
                            className="flex items-center gap-1.5 text-[10px] text-violet-400 hover:text-violet-300 hover:bg-violet-500/5 rounded-lg px-2 py-1.5 transition-all w-full text-left border border-transparent hover:border-violet-500/20"
                          >
                            <ChevronRight className="w-3 h-3 shrink-0" />
                            {q}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    {msg.timestamp && (
                      <div className="text-[9px] text-muted-foreground/50 px-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Thinking indicator */}
              {isThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/30">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-muted/50 border border-violet-500/20 rounded-2xl rounded-tl-sm px-3 py-2.5 space-y-1">
                    <div className="text-[10px] text-violet-400 font-medium animate-pulse">{thinkingStep}</div>
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Navigation shortcuts */}
            {messages.length === 0 && (
              <div className="px-3 pb-2 shrink-0">
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: "Agent", path: "/agent", icon: <Bot className="w-3 h-3" /> },
                    { label: "Compare", path: "/compare", icon: <TrendingUp className="w-3 h-3" /> },
                    { label: "Browse", path: "/products", icon: <Search className="w-3 h-3" /> },
                  ].map((nav) => (
                    <button
                      key={nav.path}
                      onClick={() => { setLocation(nav.path); setOpen(false); }}
                      className={`flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border transition-all ${
                        location === nav.path
                          ? "border-violet-500/50 bg-violet-500/10 text-violet-400"
                          : "border-border/50 hover:border-violet-500/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {nav.icon} {nav.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border/50 p-3 shrink-0 bg-card/50 backdrop-blur-sm">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything about products..."
                    disabled={isThinking}
                    className="w-full text-xs bg-muted/50 rounded-xl pl-3 pr-3 py-2.5 outline-none border border-transparent focus:border-violet-500/40 focus:bg-background transition-all placeholder:text-muted-foreground/60 disabled:opacity-60"
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={!input.trim() || isThinking}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white disabled:opacity-40 transition-opacity hover:from-violet-500 hover:to-blue-500 shadow-lg shadow-violet-500/30 shrink-0"
                >
                  {isThinking ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </motion.div>
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </motion.button>
              </form>
              <div className="text-[9px] text-muted-foreground/50 text-center mt-1.5">
                Powered by Gemini AI · {messages.length > 0 ? `${messages.length} messages` : "Ask me anything"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
