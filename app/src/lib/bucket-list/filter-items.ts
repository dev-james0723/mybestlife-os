import type { BucketFilters, BucketItem } from "@/types/bucket-list";

export function filterBucketItems(items: BucketItem[], filters: BucketFilters): BucketItem[] {
  const query = filters.search.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.statuses.length > 0) {
      if (!filters.statuses.includes(item.status)) return false;
    } else if (!filters.includeClosed && ["completed", "archived"].includes(item.status)) return false;
    if (filters.types.length > 0 && !filters.types.includes(item.type)) return false;
    if (filters.featuredOnly && !item.is_featured) return false;
    const text = [item.title, item.description, item.why_this_matters, ...item.category_tags].filter(Boolean).join(" ").toLowerCase();
    return !query || text.includes(query);
  });
}
