const USER_AGENT = "StockBridge/1.0 (barcode lookup)";

/** Per-source timeout; sources run in parallel so wall time stays near this. */
const SOURCE_TIMEOUT_MS = 5500;

/**
 * Google Custom Search JSON API — reference only (not called from barcode lookup).
 *
 * Endpoint: GET https://www.googleapis.com/customsearch/v1
 * Query params: key (API key), cx (search engine id), q (search terms), num (page size, e.g. 8).
 * Env: GOOGLE_CSE_API_KEY or GOOGLE_API_KEY; GOOGLE_CSE_ID or GOOGLE_CX.
 */

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? SOURCE_TIMEOUT_MS;
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-IN,en;q=0.9",
        "User-Agent": USER_AGENT,
        ...(options.headers || {}),
      },
      body: options.body,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

const OPEN_FACTS_HOSTS = [
  "world.openfoodfacts.org",
  "world.openproductsfacts.org",
  "world.openbeautyfacts.org",
  "world.openpetfoodfacts.org",
];

function digitCore(code) {
  return String(code || "").replace(/\D/g, "");
}

/** Try raw scan, digits-only, UPC-A→EAN-13 (leading 0), and strip leading 0 from 13-digit. */
function expandBarcodeCandidates(trimmed, digits) {
  const ordered = [];
  const add = (v) => {
    if (v == null || v === "") return;
    const s = String(v).trim();
    if (!s || ordered.includes(s)) return;
    ordered.push(s);
  };

  add(trimmed);
  add(digits);
  if (digits.length === 12) add(`0${digits}`);
  if (digits.length === 13 && digits.startsWith("0")) add(digits.slice(1));

  return ordered;
}

function combineBrandAndName(brand, name) {
  const b = (brand || "").trim();
  const n = (name || "").trim();
  if (!b) return n;
  if (!n) return b;
  if (n.toLowerCase().startsWith(b.toLowerCase())) return n;
  return `${b} ${n}`.trim();
}

function pickOpenFactsCategory(p) {
  const tags = p.categories_tags;
  if (Array.isArray(tags) && tags.length) {
    const last = tags[tags.length - 1];
    return String(last || "")
      .replace(/^en:/i, "")
      .replace(/-/g, " ")
      .trim();
  }
  if (typeof p.categories === "string" && p.categories.trim()) {
    const parts = p.categories.split(",").map((s) => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || "";
  }
  return "";
}

function normalizeOpenFacts(barcode, p, host) {
  const name = (
    p.product_name ||
    p.generic_name ||
    p.abbreviated_product_name ||
    p.product_name_en ||
    ""
  ).trim();
  const brand =
    String(p.brands || "")
      .split(/,/)
      .map((s) => s.trim())
      .filter(Boolean)[0] || "";
  const quantityText = (p.quantity || "").trim();
  const displayName = combineBrandAndName(brand, name);

  if (!displayName) return null;

  return {
    source: host.replace(/^world\./, "").replace(/\.org$/, ""),
    data: {
      barcode,
      name: displayName,
      brand,
      quantityText,
      category: pickOpenFactsCategory(p),
      image:
        p.image_front_small_url ||
        p.image_front_url ||
        p.image_url ||
        p.image_front_thumb_url ||
        "",
      suggestedSellingPrice: null,
      suggestedPurchasePrice: null,
      extra: {
        nutritionGrade: p.nutrition_grades || null,
      },
    },
  };
}

function normalizeUpcItemDb(barcode, item) {
  const brand = (item.brand || "").trim();
  const title = (item.title || item.description || "").trim();
  const name = combineBrandAndName(brand, title) || title;
  if (!name) return null;

  const low = item.lowest_recorded_price;
  const high = item.highest_recorded_price;
  let suggestedSellingPrice = null;
  if (typeof low === "number" && low > 0) {
    suggestedSellingPrice = Math.round(low * 100) / 100;
  } else if (typeof high === "number" && high > 0) {
    suggestedSellingPrice = Math.round(high * 100) / 100;
  }

  let image = "";
  if (Array.isArray(item.images) && item.images.length) {
    const first = item.images[0];
    image =
      typeof first === "string"
        ? first
        : first && typeof first === "object" && "url" in first
          ? String(first.url)
          : "";
  }

  return {
    source: "upcitemdb",
    data: {
      barcode,
      name,
      brand,
      quantityText: "",
      category: (item.category || "").trim(),
      image,
      suggestedSellingPrice,
      suggestedPurchasePrice: null,
      extra: {},
    },
  };
}

async function tryOpenFactsHostsParallel(code) {
  const settled = await Promise.allSettled(
    OPEN_FACTS_HOSTS.map(async (host) => {
      const url = `https://${host}/api/v0/product/${encodeURIComponent(code)}.json`;
      const data = await fetchJson(url, { timeoutMs: SOURCE_TIMEOUT_MS });
      if (data?.status !== 1 || !data.product) {
        throw new Error("miss");
      }
      const normalized = normalizeOpenFacts(code, data.product, host);
      if (!normalized) throw new Error("miss");
      return normalized;
    }),
  );

  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    if (s.status === "fulfilled" && s.value) return s.value;
  }
  return null;
}

/** Open Food Facts v2 search — often succeeds when v0 product JSON does not. */
async function tryOpenFoodFactsV2Search(code) {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/search?code=${encodeURIComponent(code)}&page_size=1`;
    const data = await fetchJson(url, { timeoutMs: SOURCE_TIMEOUT_MS });
    if (!data?.products?.length) return null;
    const normalized = normalizeOpenFacts(
      code,
      data.products[0],
      "world.openfoodfacts.org",
    );
    if (!normalized) return null;
    return { ...normalized, source: "openfoodfacts-v2" };
  } catch {
    return null;
  }
}

async function tryUpcItemDb(code) {
  try {
    const data = await fetchJson(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`,
      { timeoutMs: SOURCE_TIMEOUT_MS },
    );
    const item = data?.items?.[0];
    if (!item) return null;
    return normalizeUpcItemDb(code, item);
  } catch {
    return null;
  }
}

function mergeBarcodeResults(code, { facts, upc }) {
  const name = (facts?.data?.name || upc?.data?.name || "").trim();
  if (!name) return null;

  const sources = [];
  if (facts) sources.push(facts.source);
  if (upc) sources.push("upcitemdb");

  const sourceLabel = [...new Set(sources)].join("+");

  return {
    source: sourceLabel,
    data: {
      barcode: code,
      name,
      brand: facts?.data?.brand || upc?.data?.brand || "",
      quantityText: facts?.data?.quantityText || "",
      category: facts?.data?.category || upc?.data?.category || "",
      image: facts?.data?.image || upc?.data?.image || "",
      suggestedSellingPrice: upc?.data?.suggestedSellingPrice ?? null,
      suggestedPurchasePrice: null,
      extra: {
        nutritionGrade: facts?.data?.extra?.nutritionGrade ?? null,
      },
    },
  };
}

/** @returns {{ ok: true, result: object } | { ok: false, result: null }} */
export async function lookupBarcodeOnline(barcodeRaw) {
  const trimmed = String(barcodeRaw || "").trim();
  if (!trimmed) {
    return { ok: false, result: null };
  }

  const digits = digitCore(trimmed);
  const candidates = expandBarcodeCandidates(trimmed, digits);

  for (const code of candidates) {
    const core = digitCore(code);
    if (code.length < 6 && core.length < 6) continue;

    const runStructured = core.length >= 8;

    const [factsV0, factsV2, upc] = await Promise.all([
      runStructured ? tryOpenFactsHostsParallel(code) : Promise.resolve(null),
      runStructured ? tryOpenFoodFactsV2Search(code) : Promise.resolve(null),
      runStructured ? tryUpcItemDb(code) : Promise.resolve(null),
    ]);

    const facts = factsV0 || factsV2;
    const merged = mergeBarcodeResults(code, { facts, upc });
    if (merged) {
      return { ok: true, result: merged };
    }
  }

  return { ok: false, result: null };
}
