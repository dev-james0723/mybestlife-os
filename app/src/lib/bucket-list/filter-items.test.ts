import { describe, expect, it } from "vitest";
import { DEFAULT_BUCKET_FILTERS, type BucketItem } from "@/types/bucket-list";
import { filterBucketItems } from "./filter-items";

const items = [
  {id: "piano", title: "Play a piano recital", type: "growth", status: "active", category_tags: ["music"]},
  {id: "trip", title: "Kyoto visit", type: "travel", status: "dreaming", category_tags: ["Japan"]},
  {id: "done", title: "First concert", type: "growth", status: "completed", category_tags: ["music"]},
] as BucketItem[];

describe("bucket list filters", () => {
  it("matches trimmed case-insensitive searches in titles and tags", () => {
    expect(filterBucketItems(items, {...DEFAULT_BUCKET_FILTERS, search: "  MUSIC  "}).map(i => i.id)).toEqual(["piano"]);
    expect(filterBucketItems(items, {...DEFAULT_BUCKET_FILTERS, search: "Japan"}).map(i => i.id)).toEqual(["trip"]);
  });
  it("honours an explicit completed status even when closed records are hidden by default", () => {
    expect(filterBucketItems(items, {...DEFAULT_BUCKET_FILTERS, statuses: ["completed"]}).map(i => i.id)).toEqual(["done"]);
  });
  it("combines search, type and status without mutating the overall records", () => {
    expect(filterBucketItems(items, {...DEFAULT_BUCKET_FILTERS, types: ["travel"], search: "music"})).toEqual([]);
    expect(filterBucketItems(items, {...DEFAULT_BUCKET_FILTERS, includeClosed: true})).toHaveLength(3);
    expect(items).toHaveLength(3);
  });
});
