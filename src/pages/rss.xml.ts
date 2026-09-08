import rss from "@astrojs/rss";
import { getCollection, render } from "astro:content";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getPostUrl } from "@/utils/getPostPaths";
import config from "@/config";

// Astro renders image/asset URLs in post content as site-relative
// (e.g. "/_astro/diagram.svg"). That's correct on the site itself, but once
// this HTML is embedded in an RSS feed and read somewhere else entirely
// (an RSS reader, dev.to's "import from RSS"), a relative path resolves
// against THAT site's domain instead and 404s. Absolutize before embedding.
function absolutizeUrls(html: string, origin: string): string {
  const base = origin.replace(/\/$/, "");
  return html.replace(/((?:href|src)=")\/(?!\/)/g, `$1${base}/`);
}

export async function GET() {
  const posts = await getCollection("posts");
  const sortedPosts = getSortedPosts(posts);
  const container = await AstroContainer.create();

  const items = await Promise.all(
    sortedPosts.map(async post => {
      const { data, id, filePath } = post;
      const { Content } = await render(post);
      // Full body, not just the teaser description — so RSS readers and
      // importers (e.g. dev.to's "import from RSS") get the whole post,
      // not just a title and one-line summary with nothing underneath it.
      const content = absolutizeUrls(
        await container.renderToString(Content),
        config.site.url
      );

      return {
        link: getPostUrl(id, filePath, config.site.lang),
        title: data.title,
        description: data.description,
        pubDate: new Date(data.modDatetime ?? data.pubDatetime),
        content,
      };
    })
  );

  return rss({
    title: config.site.title,
    description: config.site.description,
    site: config.site.url,
    items,
  });
}
