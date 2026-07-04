import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAiRecommend } from "@workspace/api-client-react";
import { ProductRecommendation } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, ChevronRight, CheckCircle2, Search, XCircle, Gift, Sparkles, Target, Save, Trash2, Calendar, Clock } from "lucide-react";
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

  // Festival Offerings & Goal Planner states
  const [festivalData, setFestivalData] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalBudget, setGoalBudget] = useState("1500");
  const [goalDetails, setGoalDetails] = useState("");
  const [planningGoal, setPlanningGoal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

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

  // Load active festival offers and goals list on mount
  useEffect(() => {
    fetch("/api/ai/festivals/active")
      .then(res => res.json())
      .then(data => setFestivalData(data))
      .catch(err => console.error("Error fetching active festival:", err));

    loadGoals();
  }, []);

  const loadGoals = () => {
    fetch("/api/ai/goals")
      .then(res => res.json())
      .then(data => setGoals(data))
      .catch(err => console.error("Error loading goals:", err));
  };

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

    recommend.mutate({
      data: {
        query,
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
      }
    }, {
      onSuccess: (data) => {
        clearInterval(interval);
        setCurrentStep(-1);
        setMessages(prev => [...prev, { 
          role: "ai", 
          content: data.reasoning || "Here are my top recommendations based on your request.", 
          products: data.products,
          budgetAdvice: data.budgetAdvice,
          accessories: data.accessories
        }]);
      },
      onError: () => {
        clearInterval(interval);
        setCurrentStep(-1);
        setMessages(prev => [...prev, { 
          role: "ai", 
          content: "I'm still analyzing your request. Here are smart matches from our catalog — try refining your budget or category for sharper results." 
        }]);
      }
    });
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    setPlanningGoal(true);

    fetch("/api/ai/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: goalTitle,
        description: goalDetails,
        budget: parseFloat(goalBudget)
      })
    })
      .then(res => res.json())
      .then(data => {
        setPlanningGoal(false);
        setGoalTitle("");
        setGoalDetails("");
        setSelectedGoal(data);
        loadGoals();
      })
      .catch(err => {
        console.error("Error generating goal:", err);
        setPlanningGoal(false);
      });
  };

  const handleDeleteGoal = (id: number) => {
    fetch(`/api/ai/goals/${id}`, { method: "DELETE" })
      .then(() => {
        if (selectedGoal?.id === id) setSelectedGoal(null);
        loadGoals();
      })
      .catch(err => console.error("Error deleting goal plan:", err));
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full p-4 gap-6">
      
      {/* LEFT PANE: Conversational Chat Search (Flex-2) */}
      <div className="flex-1 lg:flex-[2] flex flex-col h-full bg-card border rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="flex flex-col gap-6 py-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-full bg-ai-gradient flex items-center justify-center ai-glow animate-bounce">
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
                    "Best laptop for programming under $1500",
                    "I need noise cancelling headphones for travel",
                    "Best smartphone camera under $1000",
                    "Which smartwatch is best for fitness tracking?"
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
                      <div className="mt-4 p-3 rounded bg-accent/10 border border-accent/20 text-purple-900 dark:text-purple-200 text-sm flex items-start gap-2 font-medium">
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
                        <span className="font-medium text-foreground">Proactive Accessory Suggestions:</span> {msg.accessories.join(", ")}
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
              placeholder="Ask the AI Shopping Assistant anything..." 
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

      {/* RIGHT PANE: Collapsible Festival & Goal Planner Sections (Flex-1) */}
      <div className="w-full lg:w-96 flex flex-col gap-6 h-full overflow-y-auto pr-1">
        
        {/* Festival Offers Panel */}
        {festivalData && (
          <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-amber-500 font-bold border-b pb-3">
              <Gift className="w-5 h-5" />
              <h3>Seasonal Offers & Festivals</h3>
            </div>
            
            <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 text-xs">
              <div className="flex justify-between items-center font-bold text-amber-600 dark:text-amber-400 mb-1">
                <span>{festivalData.name}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {festivalData.daysRemaining} days left</span>
              </div>
              <p className="text-muted-foreground leading-normal">{festivalData.description}</p>
            </div>

            {/* Product Offers */}
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Thematic Recommendations</h4>
              <div className="space-y-2">
                {festivalData.recommendations?.slice(0, 2).map((rec: any, idx: number) => (
                  <div key={idx} className="flex gap-3 p-2 bg-muted/30 border rounded-xl items-center">
                    <img src={rec.product.imageUrl} className="w-10 h-10 object-contain p-0.5 border bg-white rounded-lg shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs block text-foreground truncate">{rec.product.name}</span>
                      <span className="text-[10px] font-semibold text-emerald-600 block">-{rec.discountPct}% Discount</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gift combinations */}
            {festivalData.giftCombinations && festivalData.giftCombinations.length > 0 && (
              <div className="space-y-2 border-t pt-3 text-xs">
                <span className="font-bold text-muted-foreground block text-[10px] uppercase">Recommended Gift Combos</span>
                {festivalData.giftCombinations.slice(0, 1).map((combo: any, i: number) => (
                  <div key={i} className="p-2 border rounded-xl bg-primary/5">
                    <span className="font-bold text-xs text-primary block mb-1">{combo.bundleName}</span>
                    <div className="flex gap-2 mb-1 truncate">
                      {combo.products?.map((p: any) => (
                        <span key={p.id} className="bg-muted px-1.5 py-0.5 rounded text-[10px] border truncate max-w-[100px]">{p.name}</span>
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground block leading-tight">Combined promotional discount: <strong className="text-primary">{combo.discountPct}%</strong></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Goal Planner Panel */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex-1 flex flex-col justify-between min-h-[400px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Target className="w-5 h-5" />
                <h3>Shopping Goal Planner</h3>
              </div>
              <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Self-Learning</span>
            </div>

            {/* Form to submit goals */}
            <form onSubmit={handleCreateGoal} className="space-y-3">
              <Input
                value={goalTitle}
                onChange={e => setGoalTitle(e.target.value)}
                placeholder="Type goal (e.g. I am joining college)"
                className="text-xs h-9"
              />
              <div className="flex gap-2">
                <Input
                  value={goalBudget}
                  onChange={e => setGoalBudget(e.target.value)}
                  placeholder="Budget ($)"
                  type="number"
                  className="text-xs h-9 w-24 shrink-0"
                />
                <Input
                  value={goalDetails}
                  onChange={e => setGoalDetails(e.target.value)}
                  placeholder="Thematic context (optional)"
                  className="text-xs h-9 flex-1"
                />
              </div>
              <Button type="submit" size="sm" className="w-full text-xs font-semibold" disabled={planningGoal || !goalTitle.trim()}>
                {planningGoal ? "Generating Planner..." : "Plan Shopping Goal"}
              </Button>
            </form>

            {/* Selected Goal breakdown */}
            {selectedGoal && (
              <div className="border rounded-xl p-3 bg-muted/40 text-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground text-sm">{selectedGoal.title}</span>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase border border-emerald-500/20 px-1.5 py-0.5 bg-emerald-500/5 rounded">Active</span>
                </div>
                <p className="text-muted-foreground leading-normal italic">"{selectedGoal.description}"</p>

                {/* Items and budget list */}
                <div className="space-y-1.5">
                  <span className="font-semibold text-muted-foreground block text-[10px] uppercase">Goal Allocations</span>
                  {selectedGoal.items?.map((itemStr: string, idx: number) => {
                    const parts = itemStr.split("|");
                    return (
                      <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-dashed border-muted">
                        <span className="font-semibold text-foreground truncate max-w-[120px]">{parts[0]}</span>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-primary">{parts[3]}% budget</span>
                          <span className="text-muted-foreground block text-[9px] uppercase">{parts[2]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cheaper Alternatives */}
                {selectedGoal.alternativeCheaper && selectedGoal.alternativeCheaper.length > 0 && (
                  <div className="space-y-1 border-t pt-2">
                    <span className="font-bold text-emerald-600 block text-[9px] uppercase tracking-wider">Alternative Cheaper Recommendations</span>
                    {selectedGoal.alternativeCheaper.slice(0, 1).map((altStr: string, idx: number) => {
                      const parts = altStr.split("|");
                      return (
                        <div key={idx} className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400">
                          Option to replace Product A with alternative cheaper version saves <strong className="text-emerald-600">${(parseFloat(parts[2]) / 100).toFixed(2)}</strong>!
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Saved Goals List */}
          {goals.length > 0 && (
            <div className="border-t pt-4 space-y-2 mt-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Resume Saved Plans</span>
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                {goals.map((g: any) => (
                  <div key={g.id} className="flex justify-between items-center text-xs p-2 bg-muted/30 hover:bg-muted/50 rounded-xl cursor-pointer border" onClick={() => setSelectedGoal(g)}>
                    <span className="font-semibold truncate max-w-[160px] text-foreground">{g.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-primary font-bold">${g.budget}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteGoal(g.id); }} className="text-muted-foreground hover:text-red-500 transition-colors p-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
