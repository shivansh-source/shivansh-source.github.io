import type { APIRoute } from "astro";
import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";
import satori from "satori";
import sharp from "sharp";
import { getPostSlug } from "@/utils/getPostPaths";
import config from "@/config";

// Fetches a static font file for a Google Font family/weight. The CSS API
// returns one @font-face block per language subset (cyrillic, greek, latin,
// ...); Satori only needs the "latin" one, and it accepts woff/woff2/ttf/otf
// directly, so no user-agent trick is needed to force a particular format.
async function fetchGoogleFont(
  family: string,
  weight: number
): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const css = await fetch(cssUrl).then(res => res.text());

  const latinBlock = css.match(/\/\* latin \*\/\s*@font-face\s*{[^}]*}/);
  const urlMatch = (latinBlock?.[0] ?? css).match(/src: url\((.+?)\)/);
  if (!urlMatch) {
    throw new Error(`Could not resolve font file for ${family} ${weight}`);
  }

  return fetch(urlMatch[1]).then(res => res.arrayBuffer());
}

async function renderFieldReportOgImage(
  post: CollectionEntry<"posts">
): Promise<string> {
  const [serifRegular, serifBold, monoRegular] = await Promise.all([
    fetchGoogleFont("Source Serif 4", 400),
    fetchGoogleFont("Source Serif 4", 700),
    fetchGoogleFont("Source Code Pro", 500),
  ]);

  const accent = "#1f6f4a";
  const muted = "#6b7280";

  // Long titles need a smaller size to avoid overlapping the description
  // and footer below — Satori has no auto-fit, so size by length instead.
  const titleLength = post.data.title.length;
  const titleFontSize =
    titleLength <= 30 ? 84 : titleLength <= 50 ? 68 : titleLength <= 70 ? 56 : 46;

  // "A field report" fits the specific narrative framing of that one essay;
  // every other post gets a neutral kicker instead of a mismatched label.
  const eyebrow =
    post.id === "autonomous-decay" ? "A FIELD REPORT" : "NOTES";

  return satori(
    {
      type: "div",
      props: {
        style: {
          background: "#fafafa",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
        },
        children: [
          {
            type: "div",
            props: {
              style: { display: "flex", flexDirection: "column" },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      width: "64px",
                      height: "4px",
                      background: accent,
                      marginBottom: "20px",
                    },
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontFamily: "Source Code Pro",
                      fontSize: 20,
                      letterSpacing: "3px",
                      color: muted,
                      marginBottom: "28px",
                    },
                    children: eyebrow,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontFamily: "Source Serif 4",
                      fontWeight: 700,
                      fontSize: titleFontSize,
                      lineHeight: 1.15,
                      color: "#1a1a1a",
                      marginBottom: "28px",
                    },
                    children: post.data.title,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontFamily: "Source Serif 4",
                      fontSize: 32,
                      color: muted,
                    },
                    children: post.data.description,
                  },
                },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: { fontFamily: "Source Code Pro", fontSize: 20, color: muted },
                    children: post.data.author,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: { fontFamily: "Source Code Pro", fontSize: 20, color: muted },
                    children: new URL(config.site.url).hostname,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: [
        { name: "Source Serif 4", data: serifRegular, weight: 400, style: "normal" },
        { name: "Source Serif 4", data: serifBold, weight: 700, style: "normal" },
        { name: "Source Code Pro", data: monoRegular, weight: 500, style: "normal" },
      ],
    }
  );
}

export async function getStaticPaths() {
  if (!config.features.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("posts").then(p =>
    p.filter(({ data }) => !data.draft && !data.ogImage)
  );

  return posts.map(post => ({
    params: { slug: getPostSlug(post.id, post.filePath) },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props }) => {
  if (!config.features.dynamicOgImage) {
    return new Response(null, { status: 404, statusText: "Not found" });
  }

  const svg = await renderFieldReportOgImage(props as CollectionEntry<"posts">);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(pngBuffer), {
    headers: { "Content-Type": "image/png" },
  });
};
