import { useState, useEffect } from "react";
import { useGetAiMemory, useUpdateAiMemory, getGetAiMemoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Cpu, Tag, Target, DollarSign, Sparkles, Check, X, Plus } from "lucide-react";

const ALL_CATEGORIES = ["Laptops", "Smartphones", "Headphones", "Tablets", "Smartwatches", "Cameras", "Gaming", "Audio"];
const ALL_BRANDS = ["Apple", "Samsung", "Sony", "Dell", "ASUS", "OnePlus", "Microsoft", "Google", "LG", "Bose"];
const PRESET_GOALS = ["Best value for money", "Latest flagship specs", "Long battery life", "Portable & lightweight", "Gaming performance", "Professional work", "Creative / design", "Everyday use"];
const USE_CASES = [
  { label: "Student", desc: "Learning & productivity" },
  { label: "Professional", desc: "Work & business" },
  { label: "Gamer", desc: "High-performance gaming" },
  { label: "Creator", desc: "Photo, video & design" },
  { label: "Traveler", desc: "Portable & battery-focused" },
  { label: "Casual", desc: "Everyday personal use" },
];

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: memory, isLoading } = useGetAiMemory();
  const updateMemory = useUpdateAiMemory();

  const [budget, setBudget] = useState<number>(100000);
  const [userProfile, setUserProfile] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState("");
  const [selectedUseCase, setSelectedUseCase] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!memory) return;
    setBudget(memory.budget ?? 100000);
    setUserProfile(memory.userProfile ?? "");
    setSelectedCategories((memory.favoriteCategories as string[]) ?? []);
    setSelectedBrands((memory.favoriteBrands as string[]) ?? []);
    setSelectedGoals((memory.shoppingGoals as string[]) ?? []);
    const uc = (memory.shoppingGoals as string[])?.find(g => USE_CASES.some(u => u.label === g));
    if (uc) setSelectedUseCase(uc);
  }, [memory]);

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  }

  const mark = () => setIsDirty(true);

  const handleSave = () => {
    const allGoals = selectedUseCase
      ? [...selectedGoals.filter(g => !USE_CASES.some(u => u.label === g)), selectedUseCase]
      : selectedGoals.filter(g => !USE_CASES.some(u => u.label === g));

    updateMemory.mutate(
      {
        data: {
          budget,
          userProfile: userProfile || null,
          favoriteCategories: selectedCategories,
          favoriteBrands: selectedBrands,
          shoppingGoals: allGoals,
          preferredPriceRange: `0-${budget}`,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAiMemoryQueryKey() });
          setIsDirty(false);
          toast.success("Profile saved!", {
            description: "The AI agent will now personalise recommendations for you.",
          });
        },
        onError: () => {
          toast.error("Failed to save profile. Please try again.");
        },
      }
    );
  };

  const addCustomGoal = () => {
    if (!customGoal.trim() || selectedGoals.includes(customGoal.trim())) return;
    setSelectedGoals(g => [...g, customGoal.trim()]);
    setCustomGoal("");
    mark();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-6">
        <Skeleton className="h-10 w-48" />
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <User className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">AI Shopping Profile</h1>
        {memory && (
          <Badge variant="secondary" className="ml-auto flex items-center gap-1 text-xs">
            <Sparkles className="w-3 h-3" /> AI Personalised
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground mb-10 pl-11">
        Tell the AI about yourself — it uses these preferences to tailor every recommendation.
      </p>

      <div className="space-y-6">
        {/* Use Case */}
        <section className="bg-card border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Primary Use Case</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {USE_CASES.map(uc => (
              <button
                key={uc.label}
                onClick={() => { setSelectedUseCase(selectedUseCase === uc.label ? "" : uc.label); mark(); }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedUseCase === uc.label
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="font-semibold text-sm">{uc.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{uc.desc}</div>
                {selectedUseCase === uc.label && (
                  <Check className="w-4 h-4 mt-1 text-primary" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Budget */}
        <section className="bg-card border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Budget Limit</h2>
            <span className="ml-auto text-2xl font-bold text-primary">
              ${(budget / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-5">AI won't recommend products over this amount.</p>
          <Slider
            min={5000}
            max={500000}
            step={5000}
            value={[budget]}
            onValueChange={([v]) => { setBudget(v); mark(); }}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>$50</span><span>$5,000</span>
          </div>
        </section>

        {/* Favourite Categories */}
        <section className="bg-card border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Favourite Categories</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map(cat => (
              <Badge
                key={cat}
                variant={selectedCategories.includes(cat) ? "default" : "outline"}
                className="cursor-pointer select-none text-sm px-4 py-1.5 transition-all"
                onClick={() => { setSelectedCategories(c => toggle(c, cat)); mark(); }}
              >
                {cat}
                {selectedCategories.includes(cat) && <Check className="w-3 h-3 ml-1" />}
              </Badge>
            ))}
          </div>
        </section>

        {/* Favourite Brands */}
        <section className="bg-card border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Favourite Brands</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_BRANDS.map(brand => (
              <Badge
                key={brand}
                variant={selectedBrands.includes(brand) ? "default" : "outline"}
                className="cursor-pointer select-none text-sm px-4 py-1.5 transition-all"
                onClick={() => { setSelectedBrands(b => toggle(b, brand)); mark(); }}
              >
                {brand}
                {selectedBrands.includes(brand) && <Check className="w-3 h-3 ml-1" />}
              </Badge>
            ))}
          </div>
        </section>

        {/* Shopping Goals */}
        <section className="bg-card border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Shopping Goals</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_GOALS.map(goal => (
              <Badge
                key={goal}
                variant={selectedGoals.includes(goal) ? "default" : "outline"}
                className="cursor-pointer select-none text-sm px-3 py-1.5 transition-all"
                onClick={() => { setSelectedGoals(g => toggle(g, goal)); mark(); }}
              >
                {goal}
              </Badge>
            ))}
          </div>
          {selectedGoals.filter(g => !PRESET_GOALS.includes(g) && !USE_CASES.some(u => u.label === g)).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedGoals
                .filter(g => !PRESET_GOALS.includes(g) && !USE_CASES.some(u => u.label === g))
                .map(g => (
                  <Badge key={g} variant="default" className="text-sm px-3 py-1.5 gap-1">
                    {g}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => { setSelectedGoals(prev => prev.filter(x => x !== g)); mark(); }}
                    />
                  </Badge>
                ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Add a custom goal…"
              value={customGoal}
              onChange={e => setCustomGoal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustomGoal()}
              className="max-w-xs"
            />
            <Button variant="outline" size="icon" onClick={addCustomGoal}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* Profile Description */}
        <section className="bg-card border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Tell the AI about yourself</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Free-text context the AI considers for every recommendation.</p>
          <textarea
            className="w-full bg-background border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
            placeholder='e.g. "I am a software developer who travels frequently and prefers Apple ecosystem devices with great battery life."'
            value={userProfile}
            onChange={e => { setUserProfile(e.target.value); mark(); }}
          />
        </section>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <p className="text-sm text-muted-foreground">
            {isDirty ? "You have unsaved changes." : memory?.updatedAt ? `Last saved ${new Date(memory.updatedAt).toLocaleDateString()}` : ""}
          </p>
          <Button
            size="lg"
            className="gap-2"
            onClick={handleSave}
            disabled={updateMemory.isPending || !isDirty}
          >
            {updateMemory.isPending ? (
              <><span className="animate-spin">⚙</span> Saving…</>
            ) : (
              <><Check className="w-4 h-4" /> Save Profile</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
