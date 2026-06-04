import { useEffect } from "react";
import { DEFAULT_SEO_IMAGE, getAbsoluteUrl, SITE_NAME } from "../seo/siteMeta";

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

function upsertLink(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("link");
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

function syncJsonLd(jsonLd) {
  document.head.querySelectorAll("script[type='application/ld+json'][data-seo-managed='true']").forEach((element) => {
    element.remove();
  });

  jsonLd.filter(Boolean).forEach((schema) => {
    const element = document.createElement("script");
    element.setAttribute("type", "application/ld+json");
    element.setAttribute("data-seo-managed", "true");
    element.textContent = JSON.stringify(schema);
    document.head.appendChild(element);
  });
}

function SeoMeta({
  title,
  description,
  path = "/",
  canonicalUrl,
  image = DEFAULT_SEO_IMAGE,
  robots = "index,follow",
  ogType = "website",
  jsonLd = []
}) {
  useEffect(() => {
    const url = canonicalUrl || getAbsoluteUrl(path);

    document.title = title;
    upsertMeta("meta[name='description']", { name: "description", content: description });
    upsertMeta("meta[name='robots']", { name: "robots", content: robots });
    upsertMeta("meta[property='og:title']", { property: "og:title", content: title });
    upsertMeta("meta[property='og:description']", { property: "og:description", content: description });
    upsertMeta("meta[property='og:type']", { property: "og:type", content: ogType });
    upsertMeta("meta[property='og:url']", { property: "og:url", content: url });
    upsertMeta("meta[property='og:image']", { property: "og:image", content: image });
    upsertMeta("meta[property='og:site_name']", { property: "og:site_name", content: SITE_NAME });
    upsertMeta("meta[name='twitter:card']", { name: "twitter:card", content: "summary_large_image" });
    upsertMeta("meta[name='twitter:title']", { name: "twitter:title", content: title });
    upsertMeta("meta[name='twitter:description']", { name: "twitter:description", content: description });
    upsertMeta("meta[name='twitter:image']", { name: "twitter:image", content: image });
    upsertLink("link[rel='preconnect'][href='https://images.unsplash.com']", {
      rel: "preconnect",
      href: "https://images.unsplash.com"
    });
    upsertCanonical(url);
    syncJsonLd(jsonLd);
  }, [canonicalUrl, description, image, jsonLd, ogType, path, robots, title]);

  return null;
}

export default SeoMeta;
