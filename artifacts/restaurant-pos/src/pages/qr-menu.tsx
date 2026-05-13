import { useEffect, useState } from "react";
import { useParams } from "wouter";

interface PublicOutlet {
  id: number;
  name: string;
  address: string;
  phone: string;
  currency: string;
}
interface PublicCategory {
  id: number;
  name: string;
  sortOrder: number;
}
interface PublicItem {
  id: number;
  categoryId: number | null;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  imageUrl: string | null;
}
interface PublicMenu {
  outlet: PublicOutlet;
  categories: PublicCategory[];
  items: PublicItem[];
}

export default function QrMenu() {
  const { outletId } = useParams<{ outletId: string }>();
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCatId, setActiveCatId] = useState<number | null>(null);

  useEffect(() => {
    if (!outletId) return;
    setLoading(true);
    fetch(`/api/public/menu/${outletId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "Menu not found" : "Failed to load menu");
        return r.json() as Promise<PublicMenu>;
      })
      .then((data) => {
        setMenu(data);
        setActiveCatId(data.categories[0]?.id ?? null);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [outletId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading menu…</p>
        </div>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-4xl">🍽️</p>
          <p className="text-lg font-semibold">Menu unavailable</p>
          <p className="text-sm text-muted-foreground">{error ?? "Unknown error"}</p>
        </div>
      </div>
    );
  }

  const { outlet, categories, items } = menu;
  const currency = outlet.currency ?? "USD";

  const displayCats = categories.length > 0
    ? categories
    : [{ id: 0, name: "Menu", sortOrder: 0 }];

  const filteredItems = activeCatId === 0
    ? items
    : items.filter((i) => i.categoryId === activeCatId);

  const availableCount = items.filter((i) => i.isAvailable).length;

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Hero header */}
      <div className="bg-primary text-primary-foreground px-6 pt-10 pb-8">
        <p className="text-primary-foreground/60 text-xs uppercase tracking-widest font-semibold mb-1">
          Digital Menu
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight leading-none">{outlet.name}</h1>
        {outlet.address && (
          <p className="text-primary-foreground/70 text-sm mt-2">{outlet.address}</p>
        )}
        {outlet.phone && (
          <p className="text-primary-foreground/70 text-sm">{outlet.phone}</p>
        )}
        <div className="mt-4 inline-flex items-center gap-2 bg-primary-foreground/10 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs font-medium">{availableCount} items available</span>
        </div>
      </div>

      {/* Category tabs */}
      {displayCats.length > 1 && (
        <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
          <div className="flex overflow-x-auto scrollbar-none px-4 gap-1 py-3">
            {displayCats.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCatId(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  activeCatId === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🫙</p>
            <p className="text-muted-foreground">No items in this category</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-card border border-border rounded-2xl overflow-hidden flex items-stretch gap-0 transition-opacity ${
                !item.isAvailable ? "opacity-50" : ""
              }`}
            >
              {/* Image */}
              {item.imageUrl ? (
                <div className="w-24 flex-shrink-0">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-24 flex-shrink-0 bg-muted flex items-center justify-center">
                  <span className="text-3xl">🍽️</span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-base leading-snug">{item.name}</p>
                    {!item.isAvailable && (
                      <span className="flex-shrink-0 text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Sold out
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
                <p className="text-primary font-bold text-lg mt-2">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency,
                    minimumFractionDigits: 2,
                  }).format(Number(item.price))}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-10 text-center px-6">
        <p className="text-muted-foreground text-xs">
          Powered by <span className="font-semibold text-foreground">ChainPOS</span>
        </p>
      </div>
    </div>
  );
}
