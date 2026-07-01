import { useState } from "react";
import { useListProducts, getListProductsQueryKey, useListCategories } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter, Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";

export default function Products() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [priceRange, setPriceRange] = useState([0, 5000]);

  // Debounce search
  useState(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  });

  const { data: categories, isLoading: loadingCategories } = useListCategories();
  const { data: products, isLoading: loadingProducts } = useListProducts({
    search: debouncedSearch || undefined,
    category,
    minPrice: priceRange[0],
    maxPrice: priceRange[1]
  }, { query: { queryKey: getListProductsQueryKey({ search: debouncedSearch || undefined, category, minPrice: priceRange[0], maxPrice: priceRange[1] }) } });

  const [compareItems, setCompareItems] = useState<number[]>([]);

  const handleCompareSelect = (productId: number, selected: boolean) => {
    setCompareItems(prev => {
      if (selected && prev.length < 3) return [...prev, productId];
      if (!selected) return prev.filter(id => id !== productId);
      return prev;
    });
  };

  const handleCompare = () => {
    if (compareItems.length >= 2) {
      setLocation(`/compare?ids=${compareItems.join(',')}`);
    }
  };

  const Filters = () => (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold mb-4 text-lg">Categories</h3>
        {loadingCategories ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="cat-all" 
                checked={category === undefined}
                onCheckedChange={() => setCategory(undefined)}
              />
              <label htmlFor="cat-all" className="text-sm font-medium leading-none cursor-pointer">All Categories</label>
            </div>
            {categories?.map(c => (
              <div key={c.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`cat-${c.slug}`} 
                  checked={category === c.slug}
                  onCheckedChange={() => setCategory(c.slug)}
                />
                <label htmlFor={`cat-${c.slug}`} className="text-sm font-medium leading-none cursor-pointer">
                  {c.name} <span className="text-muted-foreground ml-1">({c.productCount})</span>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold mb-4 text-lg">Price Range</h3>
        <Slider 
          min={0} 
          max={5000} 
          step={50} 
          value={priceRange} 
          onValueChange={setPriceRange}
          className="mb-6"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>${priceRange[0]}</span>
          <span>${priceRange[1]}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Products</h1>
          <p className="text-muted-foreground mt-1">Browse our entire catalog of AI-scored items.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden shrink-0">
                <Filter className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader className="mb-6">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <Filters />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24">
            <Filters />
          </div>
        </aside>
        
        <main className="flex-1">
          {compareItems.length > 0 && (
            <div className="mb-6 p-4 rounded-xl border bg-accent/10 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-2">
                <span className="font-medium text-accent-foreground">{compareItems.length} selected for comparison</span>
                <span className="text-xs text-muted-foreground">(Max 3)</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setCompareItems([])}>Clear</Button>
                <Button size="sm" disabled={compareItems.length < 2} onClick={handleCompare}>
                  Compare Now
                </Button>
              </div>
            </div>
          )}

          {loadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[250px] w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : products?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products?.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  showCompareToggle={true}
                  isSelectedForCompare={compareItems.includes(product.id)}
                  onCompareSelect={(p, selected) => handleCompareSelect(p.id, selected)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
