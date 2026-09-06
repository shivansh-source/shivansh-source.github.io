import { getRelativeLocaleUrl } from "astro:i18n";
import type { CollectionEntry } from "astro:content";
import { BLOG_PATH } from "@/content.config";
import { slugifyStr } from "./slugify";
import config from "@/config";

function getPostPathSegments(filePath: string | undefined): string[] {
  return (
    filePath
      ?.replace(BLOG_PATH, "")
      .split("/")
      .filter(path => path !== "")
      .filter(path => !path.startsWith("_"))
      .slice(0, -1)
      .map(segment => slugifyStr(segment)) ?? []
  );
}

function getIdSlug(id: string): string {
  const postId = id.split("/");
  return postId.length > 0 ? String(postId[postId.length - 1]) : id;
}

function getPostSlugPath(id: string, filePath: string | undefined): string {
  const pathSegments = getPostPathSegments(filePath);
  const slug = getIdSlug(id);
  return pathSegments.length > 0
    ? [...pathSegments, slug].join("/")
    : String(slug);
}

/**
 * Returns the slug-only path for use as a route param in `getStaticPaths`.
 * No base prefix, no locale — Astro handles those at a higher level.
 * e.g. `/examples/my-post`
 */
export function getPostSlug(id: string, filePath: string | undefined): string {
  return `/${getPostSlugPath(id, filePath)}`;
}

/**
 * Returns a fully navigable URL for use in `<a href>` and RSS links.
 * Applies both locale routing and the configured Astro base via
 * `getRelativeLocaleUrl`.
 * e.g. `/posts/my-post` or `/en/posts/my-post`
 */
export function getPostUrl(
  id: string,
  filePath: string | undefined,
  locale: string | undefined = config.site.lang
): string {
  return getRelativeLocaleUrl(locale, `posts/${getPostSlugPath(id, filePath)}`);
}

/**
 * Resolves the same OG image URL used for a post's `<meta property="og:image">`
 * — a manually set `ogImage`, or (when `dynamicOgImage` is enabled) the
 * generated `/posts/<slug>/index.png` — so it can also be rendered visibly
 * as a cover image, e.g. on the post page or in a listing card.
 */
export function getPostOgImageUrl(
  post: CollectionEntry<"posts">,
  origin: string,
  locale: string | undefined = config.site.lang
): string | undefined {
  const { ogImage } = post.data;

  let ogImageUrl: string | undefined;
  if (typeof ogImage === "string") {
    ogImageUrl = ogImage;
  } else if (ogImage?.src) {
    ogImageUrl = ogImage.src;
  }

  if (!ogImageUrl && config.features.dynamicOgImage) {
    const postUrl = getPostUrl(post.id, post.filePath, locale).replace(
      /\/+$/,
      ""
    );
    ogImageUrl = `${postUrl}/index.png`;
  }

  return ogImageUrl ? new URL(ogImageUrl, origin).href : undefined;
}
