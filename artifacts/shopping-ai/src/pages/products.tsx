import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useListProducts, getListProductsQueryKey, useListCategories } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Filter, Search, X, SlidersHorizontal, LayoutGrid, List } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLocation } from "wouter";

const MAX_PRICE = 500000;

export default function Products() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [priceRange, setPriceRange] = useState([0, MAX_PRICE]);
  const [compareItems, setCompareItems] = useState<number[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    const q = params.get("search") || params.get("q");
    if (cat) setCategory(cat);
    if (q) setSearch(q);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: categories, isLoading: loadingCategories } = useListCategories();
  const { data: products, isLoading: loadingProducts } = useListProducts(
    {
      search: debouncedSearch || undefined,
      category,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < MAX_PRICE ? priceRange[1] : undefined,
    },
    {
      query: {
        queryKey: getListProductsQueryKey({
          search: debouncedSearch || undefined,
          category,
          minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
          maxPrice: priceRange[1] < MAX_PRICE ? priceRange[1] : undefined,
        }),
      },
    }
  );

  const handleCompareSelect = (productId: number, selected: boolean) => {
    setCompareItems(prev => {
      if (selected && prev.length < 3) return [...prev, productId];
      if (!selected) return prev.filter(id => id !== productId);
      return prev;
    });
  };

  const handleCompare = () => {
    if (compareItems.length >= 2) setLocation(`/compare?ids=${compareItems.join(",")}`);
  };

  const formatPrice = (v: number) => {
    if (v >= 100000) return `$${(v / 100).toLocaleString()}`;
    return `$${(v / 100).toFixed(0)}`;
  };

  const Filters = () => (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold mb-4 text-sm uppercase tracking-widest text-muted-foreground">Categories</h3>
        {loadingCategories ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}</div>
        ) : (
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setCategory(undefined)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                category === undefined ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              All Categories
              {category === undefined && <Badge variant="secondary" className="text-[10px]">{products?.length ?? "—"}</Badge>}
            </button>
            {categories?.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(category === c.slug ? undefined : c.slug)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  category === c.slug ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {c.name}
                <Badge variant="outline" className="text-[10px]">{c.productCount}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold mb-4 text-sm uppercase tracking-widest text-muted-foreground">Price Range</h3>
        <Slider
          min={0}
          max={MAX_PRICE}
          step={5000}
          value={priceRange}
          onValueChange={setPriceRange}
          className="mb-4"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium bg-muted rounded-lg px-3 py-1">{formatPrice(priceRange[0])}</span>
          <span className="text-sm font-medium bg-muted rounded-lg px-3 py-1">
            {priceRange[1] >= MAX_PRICE ? "Any" : formatPrice(priceRange[1])}
          </span>
        </div>
      </div>

      {(category || priceRange[0] > 0 || priceRange[1] < MAX_PRICE) && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => { setCategory(undefined); setPriceRange([0, MAX_PRICE]); setSearch(""); }}
        >
          <X className="w-3 h-3 mr-1" /> Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-16 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Product Catalog</h1>
              <p className="text-sm text-muted-foreground">
                {loadingProducts ? "Loading…" : `${products?.length ?? 0} products`}
                {category && ` in ${category}`}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 rounded-xl"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden shrink-0 rounded-xl">
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2"><Filter className="w-4 h-4" /> Filters</SheetTitle>
                  </SheetHeader>
                  <Filters />
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Active filter pills */}
          {(category || search) && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {category && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setCategory(undefined)}>
                  {category} <X className="w-3 h-3" />
                </Badge>
              )}
              {search && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSearch("")}>
                  "{search}" <X className="w-3 h-3" />
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden md:block w-60 shrink-0">
            <div className="sticky top-40 bg-card border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Filters</span>
              </div>
              <Filters />
            </div>
          </aside>

          {/* Grid */}
          <main className="flex-1 min-w-0">
            <AnimatePresence>
              {compareItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="mb-6 p-4 rounded-2xl border border-primary/30 bg-primary/5 flex items-center justify-between"
                >
                  <span className="font-medium text-sm">
                    <span className="font-bold text-primary">{compareItems.length}</span> selected for AI comparison
                    <span className="text-muted-foreground ml-1">(max 3)</span>
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setCompareItems([])}>Clear</Button>
                    <Button size="sm" disabled={compareItems.length < 2} onClick={handleCompare} className="rounded-xl">
                      Compare Now →
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loadingProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="flex flex-col space-y-3">
                    <Skeleton className="h-52 w-full rounded-2xl" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-4 w-1/2 rounded" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : products?.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Search className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting filters or searching something else.</p>
                <Button variant="outline" onClick={() => { setCategory(undefined); setPriceRange([0, MAX_PRICE]); setSearch(""); }}>
                  Clear filters
                </Button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products?.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    showCompareToggle={true}
                    isSelectedForCompare={compareItems.includes(product.id)}
                    onCompareSelect={(p, selected) => handleCompareSelect(p.id, selected)}
                    index={i}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
