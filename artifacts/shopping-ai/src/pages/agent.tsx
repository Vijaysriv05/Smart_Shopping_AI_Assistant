import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAiRecommend } from "@workspace/api-client-react";
import { ProductRecommendation } from "@workspace/api-client-react/src/generated/api.schemas";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, ChevronRight, CheckCircle2, Search, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const reasoningSteps = [
  "Analyzing your request...",
  "Scanning product catalog...",
  "Evaluating specs and reviews...",
  "Running price intelligence...",
  "Ranking by your preferences...",
  "Generating final recommendations..."
];

export default function Agent() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialQuery = searchParams.get("q") || "";

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai", content: string, products?: ProductRecommendation[], budgetAdvice?: string | null, accessories?: string[] }>>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recommend = useAiRecommend();

  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStep]);

  const handleSearch = (query: string) => {
    if (!query.trim()) return;

    setMessages(prev => [...prev, { role: "user", content: query }]);
    setInput("");
    setCurrentStep(0);

    // Simulate reasoning steps
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < reasoningSteps.length) {
        setCurrentStep(step);
      } else {
        clearInterval(interval);
      }
    }, 800);

    recommend.mutate({ data: { query } }, {
      onSuccess: (data) => {
        clearInterval(interval);
        setCurrentStep(-1);
        setMessages(prev => [...prev, { 
          role: "ai", 
          content: data.reasoning, 
          products: data.products,
          budgetAdvice: data.budgetAdvice,
          accessories: data.accessories
        }]);
      },
      onError: () => {
        clearInterval(interval);
        setCurrentStep(-1);
        setMessages(prev => [...prev, { role: "ai", content: "I encountered an error while searching. Please try again." }]);
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto w-full p-4">
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="flex flex-col gap-6 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 rounded-full bg-ai-gradient flex items-center justify-center ai-glow">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2 text-ai-gradient">Your Personal AI Shopping Expert</h2>
                <p className="text-muted-foreground max-w-md">
                  Tell me what you're looking for, your budget, or specific requirements, and I'll find the perfect match.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl mt-8">
                {[
                  "Best noise cancelling headphones under $300",
                  "I need a laptop for programming, battery life is crucial",
                  "What's the best espresso machine for beginners?",
                  "Compare high-end running shoes"
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSearch(q)}
                    className="p-3 text-sm text-left rounded-lg border bg-card hover:border-primary/50 hover:bg-accent/5 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex flex-col gap-4", msg.role === "user" ? "items-end" : "items-start")}>
              <div className={cn(
                "flex items-start gap-3 max-w-[85%]",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-ai-gradient text-white"
                )}>
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                
                <div className={cn(
                  "p-4 rounded-2xl",
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-muted/50 border border-border/50 rounded-tl-none prose prose-sm dark:prose-invert"
                )}>
                  {msg.content}
                  
                  {msg.budgetAdvice && (
                    <div className="mt-4 p-3 rounded bg-accent/10 border border-accent/20 text-accent-foreground text-sm flex items-start gap-2">
                      <Search className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{msg.budgetAdvice}</span>
                    </div>
                  )}
                </div>
              </div>

              {msg.products && msg.products.length > 0 && (
                <div className="w-full pl-11 space-y-6 mt-2">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Top Recommendations
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {msg.products.map((rec) => (
                      <div key={rec.product.id} className="relative">
                        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold z-10 shadow-lg border-2 border-background">
                          #{rec.rank}
                        </div>
                        <ProductCard product={rec.product} />
                        <div className="p-3 bg-muted/30 border-x border-b rounded-b-xl text-sm">
                          <p className="font-medium mb-1 line-clamp-2">{rec.why}</p>
                          <div className="flex flex-col gap-1 mt-2 text-xs">
                            <div className="flex items-start gap-1 text-green-500">
                              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-1">{rec.pros[0]}</span>
                            </div>
                            <div className="flex items-start gap-1 text-destructive">
                              <XCircle className="w-3 h-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-1">{rec.cons[0]}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {msg.accessories && msg.accessories.length > 0 && (
                    <div className="mt-4 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Recommended with this:</span> {msg.accessories.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {currentStep >= 0 && (
            <div className="flex items-start gap-3 w-full pl-1">
              <div className="w-8 h-8 rounded-full bg-ai-gradient text-white flex items-center justify-center shrink-0 ai-glow">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="p-4 rounded-2xl bg-muted/50 border border-primary/20 rounded-tl-none min-w-[250px]">
                <div className="flex flex-col gap-2">
                  {reasoningSteps.map((step, idx) => (
                    <div key={idx} className={cn(
                      "flex items-center gap-2 text-sm transition-opacity duration-300",
                      idx < currentStep ? "text-muted-foreground" : idx === currentStep ? "text-primary font-medium" : "opacity-0 h-0 overflow-hidden"
                    )}>
                      {idx < currentStep ? <CheckCircle2 className="w-4 h-4" /> : idx === currentStep ? <ChevronRight className="w-4 h-4 animate-bounce" /> : null}
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="pt-4 border-t mt-auto">
        <form 
          className="relative flex items-center"
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(input);
          }}
        >
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..." 
            className="pr-12 h-12 rounded-full bg-muted/50 border-primary/20 focus-visible:ring-primary/50"
            disabled={recommend.isPending}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="absolute right-1 rounded-full h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={!input.trim() || recommend.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
