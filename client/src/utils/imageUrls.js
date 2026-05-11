export function isUnsplashPageUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return (hostname === "unsplash.com" || hostname === "www.unsplash.com") && parsed.pathname.startsWith("/photos/");
  } catch (_error) {
    return false;
  }
}

export function imageUrlIssue(url) {
  if (!url) return "";

  if (isUnsplashPageUrl(url)) {
    return "Unsplash photo page links do not render as images. Use Copy image address or an images.unsplash.com URL.";
  }

  return "";
}

export function imageAtWidth(url, width) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("images.unsplash.com")) return url;

    parsed.searchParams.set("w", String(width));
    parsed.searchParams.set("q", "80");
    parsed.searchParams.set("auto", parsed.searchParams.get("auto") || "format");
    parsed.searchParams.set("fit", parsed.searchParams.get("fit") || "crop");
    return parsed.toString();
  } catch (_error) {
    return url;
  }
}

export function imageSrcSet(url) {
  if (!url) return "";
  return [640, 960, 1280].map((width) => `${imageAtWidth(url, width)} ${width}w`).join(", ");
}

export function visualClass(category) {
  return `menu-image-fallback visual-${String(category || "default").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}
