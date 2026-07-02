import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, ChevronRight, Sparkles, Zap } from "lucide-react";
import { useAiRecommend } from "@workspace/api-client-react";
import { ProductCard } from "./product-card";

type Suggestion = { label: string; query: string };

const PAGE_CONTEXT: Record<string, { title: string; suggestions: Suggestion[] }> = {
  "/": {
    title: "Welcome! Ask me anything",
    suggestions: [
      { label: "Best laptop under $1000", query: "Best laptop for students under 100000" },
      { label: "Top running shoes", query: "Best running shoes for marathon training" },
      { label: "Gift ideas under $50", query: "Best gift ideas under 5000" },
      { label: "Budget smartphone", query: "Best budget smartphone under 20000" },
    ],
  },
  "/products": {
    title: "I can help you filter smarter",
    suggestions: [
      { label: "Highest rated items", query: "Show me top rated products across all categories" },
      { label: "Best value deals", query: "Best value for money products with discount" },
      { label: "New arrivals", query: "Latest products released recently" },
      { label: "Compare top picks", query: "Compare the best products in each category" },
    ],
  },
  "/agent": {
    title: "I'm ready to search for you",
    suggestions: [
      { label: "Programming laptop", query: "Best laptop for Python and AI development" },
      { label: "Noise-cancelling headphones", query: "Best noise cancelling headphones for office" },
      { label: "Home gym setup", query: "Complete home gym setup under 15000" },
      { label: "Skincare routine", query: "Best skincare products for daily routine" },
    ],
  },
  "/compare": {
    title: "Need help picking products to compare?",
    suggestions: [
      { label: "Top 3 laptops", query: "Best 3 laptops to compare for purchase" },
      { label: "Top 3 phones", query: "Best 3 smartphones to compare right now" },
      { label: "Headphones comparison", query: "Top 3 headphones for music lovers" },
      { label: "Fitness gear", query: "Best fitness equipment to compare" },
    ],
  },
  "/dashboard": {
    title: "Personalized insights ready",
    suggestions: [
      { label: "My wishlist analysis", query: "Analyze my saved products and suggest best buy" },
      { label: "Budget optimization", query: "How can I save money on my shopping list" },
      { label: "Price drop alerts", query: "Which products have dropped in price recently" },
      { label: "Smart upgrades", query: "Suggest upgrades based on my shopping history" },
    ],
  },
  "/autonomous": {
    title: "AI Command Center active",
    suggestions: [
      { label: "Top AI picks today", query: "What are today's top AI recommended products" },
      { label: "Overpriced items", query: "Which products are overpriced and should be avoided" },
      { label: "Best bundles", query: "What bundle deals save the most money today" },
      { label: "Trending right now", query: "What is trending in shopping right now" },
    ],
  },
};

function getPageContext(location: string) {
  if (location.startsWith("/products/")) {
    return {
      title: "AI product insights",
      suggestions: [
        { label: "Similar products", query: "Find similar products to compare" },
        { label: "Better alternatives", query: "Is there a better alternative for less money" },
        { label: "Accessories", query: "What accessories do I need with this product" },
        { label: "Price trend", query: "Will this product get cheaper soon" },
      ],
    };
  }
  return PAGE_CONTEXT[location] || PAGE_CONTEXT["/"];
}

export function FloatingAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; content: string; products?: any[] }>>([]);
  const [location] = useLocation();
  const recommend = useAiRecommend();
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const context = getPageContext(location);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset messages when navigating
  useEffect(() => {
    setMessages([]);
  }, [location]);

  const handleSend = (query: string) => {
    if (!query.trim() || recommend.isPending) return;
    const q = query.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);

    recommend.mutate(
      { data: { query: q } },
      {
        onSuccess: (data) => {
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              content: data.reasoning || "Here are my top picks for you:",
              products: data.products?.slice(0, 2),
            },
          ]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: "Sorry, I couldn't fetch results. Please try again." },
          ]);
        },
      }
    );
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-2xl shadow-violet-500/40 flex items-center justify-center ring-2 ring-violet-400/30 hover:shadow-violet-500/60 transition-shadow"
          >
            <Bot className="w-7 h-7" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] rounded-2xl bg-card border shadow-2xl shadow-black/30 flex flex-col overflow-hidden"
            style={{ maxHeight: "min(600px, calc(100vh - 96px))" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600/90 to-blue-600/90 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-white font-bold text-sm leading-none">AI Shopping Agent</div>
                  <div className="text-white/70 text-[10px] mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                    Autonomous · Zero human control
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-none p-3 text-sm">
                      <p className="font-semibold mb-1">{context.title}</p>
                      <p className="text-muted-foreground text-xs">I automatically understand your needs and rank the best products.</p>
                    </div>
                  </div>

                  <div className="pl-9">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-semibold">Quick suggestions</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {context.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(s.query)}
                          className="text-left text-xs p-2 rounded-xl border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-1.5"
                        >
                          <Zap className="w-3 h-3 text-primary shrink-0" />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                  {msg.role === "ai" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className="max-w-[85%] space-y-2">
                    <div
                      className={`px-3 py-2 rounded-2xl text-xs ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted rounded-tl-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.products && msg.products.length > 0 && (
                      <div className="space-y-2">
                        {msg.products.map((rec: any) => (
                          <div key={rec.product.id} className="rounded-xl border bg-card overflow-hidden">
                            <div className="flex items-center gap-2 p-2">
                              {rec.product.imageUrl && (
                                <img src={rec.product.imageUrl} alt={rec.product.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate">{rec.product.name}</div>
                                <div className="text-[10px] text-muted-foreground">{rec.product.brand}</div>
                                <div className="text-xs font-bold text-primary mt-0.5">${(rec.product.price / 100).toFixed(0)}</div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="text-[10px] font-bold text-green-500">#{rec.rank}</div>
                                <div className="text-[10px] text-muted-foreground">{rec.score}/100</div>
                              </div>
                            </div>
                            {rec.why && (
                              <div className="px-2 pb-2 text-[10px] text-muted-foreground border-t pt-1.5">{rec.why}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {recommend.isPending && (
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white animate-pulse" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-none px-3 py-2">
                    <div className="flex gap-1 items-center">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                className="flex gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  disabled={recommend.isPending}
                  className="flex-1 text-xs bg-muted rounded-xl px-3 py-2 outline-none border border-transparent focus:border-primary/50 focus:bg-background transition-all placeholder:text-muted-foreground disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || recommend.isPending}
                  className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 transition-opacity hover:bg-primary/90 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-[10px] text-muted-foreground hover:text-foreground mt-1.5 w-full text-center transition-colors"
                >
                  Clear conversation
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
