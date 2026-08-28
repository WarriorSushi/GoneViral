import { canonicalizeDestination, type SafeDestination } from "./destination";
import {
  LISTING_NAME_MAX_GRAPHEMES,
  LISTING_TAGLINE_MAX_GRAPHEMES,
} from "./policy";

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

export type ListingEditInput = Readonly<{
  categorySlug: string;
  destination: SafeDestination;
  name: string;
  tagline: string;
}>;

export type ListingEditField = "category" | "destination" | "name" | "tagline";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function graphemes(value: string) {
  return [...segmenter.segment(value)].length;
}

export function normalizeListingName(value: string) {
  return value.normalize("NFKC").toLowerCase();
}

export function validateListingEdit(formData: FormData):
  | Readonly<{ ok: true; value: ListingEditInput }>
  | Readonly<{
      errors: Partial<Record<ListingEditField, string>>;
      ok: false;
    }> {
  const name = text(formData, "name");
  const tagline = text(formData, "tagline");
  const categorySlug = text(formData, "category");
  const destination = canonicalizeDestination(text(formData, "destination"));
  const errors: Partial<Record<ListingEditField, string>> = {};
  if (!name || graphemes(name) > LISTING_NAME_MAX_GRAPHEMES)
    errors.name = `Enter a name of ${LISTING_NAME_MAX_GRAPHEMES} characters or fewer.`;
  if (!tagline || graphemes(tagline) > LISTING_TAGLINE_MAX_GRAPHEMES)
    errors.tagline = `Enter a tagline of ${LISTING_TAGLINE_MAX_GRAPHEMES} characters or fewer.`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(categorySlug))
    errors.category = "Choose a current category.";
  if (!destination.ok)
    errors.destination = "Enter a direct, public HTTPS website URL.";
  if (Object.keys(errors).length > 0 || !destination.ok)
    return { errors, ok: false };
  return {
    ok: true,
    value: { categorySlug, destination: destination.value, name, tagline },
  };
}
