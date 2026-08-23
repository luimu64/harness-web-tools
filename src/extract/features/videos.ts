import type { CheerioAPI } from "cheerio";
import { absUrl } from "../util";

const META_VIDEO_PROPS = new Set([
  "og:video",
  "og:video:url",
  "og:video:secure_url",
  "twitter:player",
  "twitter:player:stream",
]);

const VIDEO_FILE_EXTENSIONS = [
  ".mp4",
  ".webm",
  ".m3u8",
  ".mov",
  ".m4v",
  ".ogv",
  ".ogg",
  ".flv",
  ".mkv",
  ".mpd",
];

const VIDEO_EMBED_HOSTS = [
  "youtube.com/embed",
  "youtube-nocookie.com/embed",
  "player.vimeo.com",
  "vimeo.com",
  "dailymotion.com/embed",
  "player.twitch.tv",
  "twitch.tv/embed",
  "bitchute.com/embed",
  "odysee.com/$/embed",
  "streamable.com",
  "rumble.com/embed",
  "kick.com",
  "facebook.com/plugins/video",
  "ok.ru/videoembed",
  "vk.com/video_ext",
];

function isVideoFile(url: string): boolean {
  const clean = url.toLowerCase().split("?")[0] || "";
  return VIDEO_FILE_EXTENSIONS.some((ext) => clean.endsWith(ext));
}

function isVideoEmbed(url: string): boolean {
  const low = url.toLowerCase();
  return VIDEO_EMBED_HOSTS.some((host) => low.includes(host));
}

export function extractVideos(
  $: CheerioAPI,
  baseUrl: string
): { heading: string; items: string[] } {
  const videos = new Set<string>();

  const add = (url?: string | null) => {
    const resolved = absUrl(baseUrl, url);
    if (resolved) {
      videos.add(resolved);
    }
  };

  // 1. <video> and <video><source> tags
  $("video").each((_, el) => {
    const $el = $(el);
    add($el.attr("src"));
    add($el.attr("data-src"));

    $el.find("source").each((__, srcEl) => {
      add($(srcEl).attr("src"));
    });
  });

  // 2. Standalone <source> with video/* mime
  $("source").each((_, el) => {
    const mime = ($(el).attr("type") || "").toLowerCase();
    if (mime.startsWith("video/")) {
      add($(el).attr("src"));
    }
  });

  // 3. <meta> video tags
  $("meta").each((_, el) => {
    const prop = ($(el).attr("property") || $(el).attr("name") || "").toLowerCase();
    if (META_VIDEO_PROPS.has(prop)) {
      add($(el).attr("content"));
    }
  });

  // 4. <iframe> video embeds
  $("iframe").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (isVideoEmbed(src)) {
      add(src);
    }
  });

  // 5. <a> links pointing directly to video files
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (isVideoFile(href)) {
      add(href);
    }
  });

  return {
    heading: "Videos",
    items: Array.from(videos).map((u) => `- ${u}`),
  };
}
