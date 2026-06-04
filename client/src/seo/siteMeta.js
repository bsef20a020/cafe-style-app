import { faqItems } from "../data/faqs";
import { fallbackMenu } from "../data/menuFallback";

export const SITE_NAME = "NOFFELO";
export const DEFAULT_SITE_URL = "https://noffelocafe.com";
export const DEFAULT_SEO_IMAGE =
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80";

const siteUrl = (import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");

export const siteDetails = {
  name: SITE_NAME,
  url: siteUrl,
  defaultImage: DEFAULT_SEO_IMAGE,
  description:
    "NOFFELO is a premium Lahore cafe and evening lounge for slow coffee, refined desserts, online ordering, and easy reservations.",
  locality: "Lahore",
  streetAddress: "MM Alam Road",
  country: "PK",
  telephone: "+923001234567",
  openingHours: "Mo-Su 09:00-23:00",
  cuisine: ["Cafe", "Coffee", "Dessert", "Bakery"]
};

export function getAbsoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteDetails.url}${normalizedPath === "/" ? "/" : normalizedPath}`;
}

function buildRestaurantSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${getAbsoluteUrl("/")}#restaurant`,
    name: siteDetails.name,
    url: getAbsoluteUrl("/"),
    image: siteDetails.defaultImage,
    description: siteDetails.description,
    servesCuisine: siteDetails.cuisine,
    priceRange: "PKR",
    telephone: siteDetails.telephone,
    openingHours: siteDetails.openingHours,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteDetails.streetAddress,
      addressLocality: siteDetails.locality,
      addressCountry: siteDetails.country
    },
    hasMenu: getAbsoluteUrl("/menu"),
    potentialAction: {
      "@type": "ReserveAction",
      target: getAbsoluteUrl("/reserve"),
      name: "Reserve a table"
    }
  };
}

function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${getAbsoluteUrl("/")}#website`,
    name: siteDetails.name,
    url: getAbsoluteUrl("/"),
    description: siteDetails.description,
    publisher: {
      "@id": `${getAbsoluteUrl("/")}#restaurant`
    }
  };
}

function buildWebPageSchema({ title, description, path }) {
  const url = getAbsoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    isPartOf: {
      "@id": `${getAbsoluteUrl("/")}#website`
    },
    about: {
      "@id": `${getAbsoluteUrl("/")}#restaurant`
    }
  };
}

function buildFAQSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${getAbsoluteUrl("/faq")}#faq`,
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
}

function buildMenuSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${getAbsoluteUrl("/menu")}#menu`,
    name: "NOFFELO Menu",
    url: getAbsoluteUrl("/menu"),
    hasMenuSection: fallbackMenu.categories.map((category) => ({
      "@type": "MenuSection",
      name: category,
      hasMenuItem: fallbackMenu.items
        .filter((item) => item.category === category)
        .map((item) => ({
          "@type": "MenuItem",
          name: item.name,
          description: item.description,
          image: item.image || undefined,
          offers: {
            "@type": "Offer",
            price: item.price,
            priceCurrency: item.currency || "PKR",
            availability: item.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
          }
        }))
    }))
  };
}

function buildReserveSchema(meta) {
  return {
    ...buildWebPageSchema(meta),
    potentialAction: {
      "@type": "ReserveAction",
      target: getAbsoluteUrl("/reserve"),
      name: "Reserve a table at NOFFELO"
    }
  };
}

const publicSchemas = [buildRestaurantSchema(), buildWebsiteSchema()];

const routeMeta = {
  "/": {
    title: "NOFFELO - Cafe & Evening Lounge in Lahore",
    description:
      "Visit NOFFELO for slow coffee, refined desserts, online ordering, and easy table reservations in a polished Lahore cafe and lounge.",
    path: "/",
    jsonLd: (meta) => [...publicSchemas, buildWebPageSchema(meta)]
  },
  "/menu": {
    title: "Menu - NOFFELO Coffee, Desserts & Lounge Favorites",
    description:
      "Explore NOFFELO's cafe menu with signature coffee, matcha, bakery items, desserts, and lounge favorites for pickup or delivery.",
    path: "/menu",
    jsonLd: (meta) => [...publicSchemas, buildWebPageSchema(meta), buildMenuSchema()]
  },
  "/our-story": {
    title: "Our Story - NOFFELO Cafe & Evening Lounge",
    description:
      "Discover how NOFFELO blends Lahore cafe culture, dessert service, and a calm evening lounge rhythm for memorable visits.",
    path: "/our-story",
    jsonLd: (meta) => [...publicSchemas, buildWebPageSchema(meta)]
  },
  "/faq": {
    title: "FAQ - NOFFELO Hours, Reservations, Orders & Payments",
    description:
      "Find answers about NOFFELO opening hours, reservations, online ordering, pickup, delivery, payments, and guest support.",
    path: "/faq",
    jsonLd: (meta) => [...publicSchemas, buildWebPageSchema(meta), buildFAQSchema()]
  },
  "/reserve": {
    title: "Reserve a Table - NOFFELO Lahore",
    description:
      "Request a NOFFELO table with guest details, business-hour slots, booking reference, and WhatsApp follow-up from the team.",
    path: "/reserve",
    jsonLd: (meta) => [...publicSchemas, buildReserveSchema(meta)]
  },
  "/login": {
    title: "Customer Login - NOFFELO",
    description: "Sign in to your NOFFELO customer account.",
    path: "/login",
    robots: "noindex,nofollow"
  },
  "/signup": {
    title: "Create Account - NOFFELO",
    description: "Create a NOFFELO customer account for faster checkout and reservations.",
    path: "/signup",
    robots: "noindex,nofollow"
  },
  "/forgot-password": {
    title: "Reset Password - NOFFELO",
    description: "Request a secure password reset link for your NOFFELO customer account.",
    path: "/forgot-password",
    robots: "noindex,nofollow"
  },
  "/reset-password": {
    title: "Choose New Password - NOFFELO",
    description: "Set a new password for your NOFFELO customer account.",
    path: "/reset-password",
    robots: "noindex,nofollow"
  },
  "/account": {
    title: "Account - NOFFELO",
    description: "View your NOFFELO orders, reservations, and customer details.",
    path: "/account",
    robots: "noindex,nofollow"
  },
  "/orders": {
    title: "Order Status - NOFFELO",
    description: "Track your NOFFELO online order status and payment state.",
    path: "/orders",
    robots: "noindex,nofollow"
  },
  "/admin/login": {
    title: "Staff Login - NOFFELO",
    description: "Authorized NOFFELO staff portal.",
    path: "/admin/login",
    robots: "noindex,nofollow"
  },
  "/admin": {
    title: "Admin Dashboard - NOFFELO",
    description: "NOFFELO private operations dashboard.",
    path: "/admin",
    robots: "noindex,nofollow"
  }
};

const notFoundMeta = {
  title: "Page Not Found - NOFFELO",
  description: "The requested NOFFELO page could not be found.",
  path: "/404",
  robots: "noindex,nofollow"
};

export function getSeoForPath(pathname) {
  const meta =
    routeMeta[pathname] ||
    (pathname.startsWith("/orders/") ? { ...routeMeta["/orders"], path: pathname } : null) ||
    (pathname.startsWith("/reset-password/") ? { ...routeMeta["/reset-password"], path: pathname } : null) ||
    notFoundMeta;

  const robots = meta.robots || "index,follow";
  const jsonLd = typeof meta.jsonLd === "function" ? meta.jsonLd(meta) : meta.jsonLd || [];

  return {
    ...meta,
    robots,
    image: meta.image || siteDetails.defaultImage,
    canonicalUrl: getAbsoluteUrl(meta.path || pathname),
    jsonLd
  };
}
