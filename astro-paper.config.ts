import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://shivansh-source.github.io/",
    title: "Shivansh Sinha",
    description:
      "Cloud-native engineer. CNCF contributor. Notes on infrastructure and AI systems.",
    author: "Shivansh Sinha",
    profile: "https://github.com/shivansh-source",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "Asia/Kolkata",
    dir: "ltr",
  },
  posts: {
    perPage: 3,
    perIndex: 4,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
    // Sign up free at goatcounter.com, then set this to your site code
    // (from yourcode.goatcounter.com) to turn on view tracking + the
    // visible read count on post pages. `false` keeps both fully off.
    viewCounter: { goatcounterCode: "shivansh-source" },
  },
  socials: [
    { name: "github", url: "https://github.com/shivansh-source" },
    {
      name: "linkedin",
      url: "https://www.linkedin.com/in/shivansh-sinha-167304307/",
    },
    { name: "x", url: "https://x.com/SSinha11233" },
    { name: "mail", url: "mailto:shivansh976053@gmail.com" },
  ],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "pinterest", url: "https://pinterest.com/pin/create/button/?url=" },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
