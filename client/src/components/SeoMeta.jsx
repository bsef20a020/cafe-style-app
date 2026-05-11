import { useEffect } from "react";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80";

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function upsertCanonical(href) {
  let element = document.head.querySelector("link[rel='canonical']");
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function SeoMeta({ title, description, path = "/", image = DEFAULT_IMAGE }) {
  useEffect(() => {
    const url = `${window.location.origin}${path}`;

    document.title = title;
    upsertMeta("meta[name='description']", { name: "description", content: description });
    upsertMeta("meta[property='og:title']", { property: "og:title", content: title });
    upsertMeta("meta[property='og:description']", { property: "og:description", content: description });
    upsertMeta("meta[property='og:type']", { property: "og:type", content: "website" });
    upsertMeta("meta[property='og:url']", { property: "og:url", content: url });
    upsertMeta("meta[property='og:image']", { property: "og:image", content: image });
    upsertMeta("meta[name='twitter:card']", { name: "twitter:card", content: "summary_large_image" });
    upsertCanonical(url);
  }, [description, image, path, title]);

  return null;
}

export default SeoMeta;
