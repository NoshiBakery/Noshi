"use strict";

(function initNoshiCart(global) {
  const STORAGE_KEY = "noshi-cart-v3";
  const LEGACY_KEY = "noshi-bakery-cart-v1";
  const products = Array.isArray(global.NOSHI_PRODUCTS) ? global.NOSHI_PRODUCTS : [];
  const productIds = new Set(products.map((product) => product.id));
  const options = global.NoshiProductOptions;

  function productById(id) { return products.find((product) => product.id === id) || null; }
  // Old keys (p01, p18::small) are kept byte-for-byte for existing carts.
  function cartKey(productId, variantId = "", flourId = "", sugarId = "") {
    return flourId || sugarId
      ? `${productId}::${variantId}::${flourId}::${sugarId}`
      : (variantId ? `${productId}::${variantId}` : productId);
  }
  function parseKey(key) {
    const parts = String(key || "").split("::");
    if (![1, 2, 4].includes(parts.length)) return null;
    const [productId, rawVariant = "", flourId = "", sugarId = ""] = parts;
    if (!/^p\d+$/.test(productId) || !/^(|small|medium)$/.test(rawVariant) ||
      !/^(|white|bran|mix)$/.test(flourId) || !/^(|balanced|reduced)$/.test(sugarId)) return null;
    const product = productById(productId);
    if (!product) return null;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (!variants.length && rawVariant) return null;
    const variantId = variants.length ? (rawVariant || variants[0].id) : "";
    if (variants.length && !variants.some(v => v.id === variantId)) return null;
    // Existing saved carts remain present; incomplete/retired choices must be corrected explicitly.
    const optionsValid = options ? options.validSelection(product, flourId, sugarId) : !(flourId || sugarId);
    return {productId, variantId, flourId, sugarId, optionsValid};
  }
  const offers = global.NoshiOffers;
  let memoryCart = Object.create(null);

  function normalize(input) {
    const output = Object.create(null);
    if (!input || typeof input !== "object" || Array.isArray(input)) return output;
    Object.entries(input).forEach(([rawKey, rawQuantity]) => {
      const parsed = parseKey(rawKey);
      const quantity = Math.floor(Number(rawQuantity));
      if (parsed && Number.isFinite(quantity) && quantity > 0) {
        output[cartKey(parsed.productId, parsed.variantId, parsed.flourId, parsed.sugarId)] = Math.min(
          (output[cartKey(parsed.productId, parsed.variantId, parsed.flourId, parsed.sugarId)] || 0) + quantity, 99);
      }
    });
    return output;
  }

  function storageRead(key) {
    try {
      return global.localStorage.getItem(key);
    } catch (_) {
      try { return global.sessionStorage.getItem(key); } catch (_) { return null; }
    }
  }

  function storageWrite(key, value) {
    try {
      global.localStorage.setItem(key, value);
      return true;
    } catch (_) {
      try {
        global.sessionStorage.setItem(key, value);
        return true;
      } catch (_) {
        return false;
      }
    }
  }

  function migrateLegacyCart() {
    const raw = storageRead(LEGACY_KEY);
    if (!raw) return Object.create(null);
    try {
      const legacy = JSON.parse(raw);
      const migrated = Object.create(null);
      Object.entries(legacy || {}).forEach(([index, quantity]) => {
        const product = products[Number(index)];
        const safeQuantity = Math.floor(Number(quantity));
        if (product && safeQuantity > 0) migrated[product.id] = Math.min(safeQuantity, 99);
      });
      return normalize(migrated);
    } catch (_) {
      return Object.create(null);
    }
  }

  function read() {
    const raw = storageRead(STORAGE_KEY);
    if (raw) {
      try {
        memoryCart = normalize(JSON.parse(raw));
        return { ...memoryCart };
      } catch (_) {
        // The invalid value is replaced below.
      }
    }

    const migrated = migrateLegacyCart();
    if (Object.keys(migrated).length) {
      memoryCart = migrated;
      storageWrite(STORAGE_KEY, JSON.stringify(memoryCart));
    }
    return { ...memoryCart };
  }

  function write(cart) {
    memoryCart = normalize(cart);
    storageWrite(STORAGE_KEY, JSON.stringify(memoryCart));
    global.dispatchEvent(new CustomEvent("noshi:cart-change", { detail: { cart: { ...memoryCart } } }));
    return { ...memoryCart };
  }

  function add(productId, amount = 1, variantId = "", flourId = "", sugarId = "") {
    const parsed = parseKey(cartKey(productId, variantId, flourId, sugarId));
    if (!parsed || !parsed.optionsValid) return read();
    const key = cartKey(parsed.productId, parsed.variantId, parsed.flourId, parsed.sugarId);
    const bag = read();
    const increment = Math.max(1, Math.floor(Number(amount) || 1));
    bag[key] = Math.min((bag[key] || 0) + increment, 99);
    return write(bag);
  }

  function setQuantity(productId, quantity, variantId = "", flourId = "", sugarId = "") {
    const parsed = parseKey(cartKey(productId, variantId, flourId, sugarId));
    if (!parsed) return read();
    const key = cartKey(parsed.productId, parsed.variantId, parsed.flourId, parsed.sugarId);
    const bag = read();
    bag[key] = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
    return write(bag);
  }

  function remove(productId, variantId = "", flourId = "", sugarId = "") {
    const parsed = parseKey(cartKey(productId, variantId, flourId, sugarId));
    if (!parsed) return read();
    const bag = read();
    delete bag[cartKey(parsed.productId, parsed.variantId, parsed.flourId, parsed.sugarId)];
    return write(bag);
  }

  function updateOptions(oldKey, flourId = "", sugarId = "") {
    const parsed = parseKey(oldKey);
    const product = parsed && productById(parsed.productId);
    if (!product || !options?.validSelection(product, flourId, sugarId)) return false;
    const bag = read();
    if (!bag[oldKey]) return false;
    const newKey = cartKey(parsed.productId, parsed.variantId, flourId, sugarId);
    if (newKey !== oldKey) {
      bag[newKey] = Math.min(99, (bag[newKey] || 0) + bag[oldKey]);
      delete bag[oldKey];
    }
    write(bag);
    return true;
  }

  function clear() {
    return write(Object.create(null));
  }

  function lines() {
    const bag = read();
    return Object.entries(bag).map(([key, quantity]) => {
      const parsed = parseKey(key);
      if (!parsed) return null;
      const product = productById(parsed.productId);
      const variant = parsed.variantId && Array.isArray(product.variants)
        ? product.variants.find((item) => item.id === parsed.variantId) || null : null;
      const pricing = offers?.pricingFor(product, parsed.variantId) || {
        originalPrice: Number(variant?.price ?? product.price ?? 0),
        finalPrice: Number(variant?.price ?? product.price ?? 0), percent: 0, hasOffer: false,
      };
      const extra = parsed.optionsValid ? (options?.extraPrice(product, parsed.flourId) || 0) : 0;
      // Apply existing offer percentage to base + option surcharge, identically to Worker.
      const originalUnitPrice = options?.round(pricing.originalPrice + extra) ?? pricing.originalPrice + extra;
      const unitPrice = options?.round(originalUnitPrice * (1 - pricing.percent / 100)) ??
        Math.round(originalUnitPrice * (1 - pricing.percent / 100) * 100) / 100;
      const originalLineTotal = originalUnitPrice * quantity;
      const lineTotal = unitPrice * quantity;
      return {key, product, variant, variantId:parsed.variantId, flourId:parsed.flourId,
        sugarId:parsed.sugarId, optionsValid:parsed.optionsValid, quantity, unitPrice,
        originalUnitPrice, discountPercent:pricing.percent,
        hasOffer:pricing.percent > 0 && unitPrice < originalUnitPrice,
        originalLineTotal, lineTotal, discountAmount:originalLineTotal - lineTotal};
    }).filter(Boolean);
  }

  function count() {
    return lines().reduce((total, line) => total + line.quantity, 0);
  }

  function subtotal() {
    return lines().reduce((total, line) => total + line.lineTotal, 0);
  }

  function originalSubtotal() {
    return lines().reduce((total, line) => total + line.originalLineTotal, 0);
  }

  function discountTotal() {
    return lines().reduce((total, line) => total + line.discountAmount, 0);
  }

  function encode(cart = read()) {
    try {
      return btoa(JSON.stringify(normalize(cart)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
    } catch (_) {
      return "";
    }
  }

  function decode(value) {
    if (!value) return null;
    try {
      const padded = String(value).replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
      return normalize(JSON.parse(atob(padded)));
    } catch (_) {
      return null;
    }
  }

  function importFromUrl() {
    const params = new URLSearchParams(global.location.search);
    const incoming = decode(params.get("cart"));
    if (!incoming) return false;
    write(incoming);
    return true;
  }

  function pageSource() {
    const filename = global.location.pathname.split("/").pop().toLowerCase();
    if (filename === "index.html" || filename === "") return "index";
    if (filename === "g.html") return "g";
    return "order";
  }

  function cartUrl(source = pageSource()) {
    return `cart.html?from=${encodeURIComponent(source)}&cart=${encode(read())}`;
  }

  function catalogUrl(source = "order") {
    const filename = source === "index" ? "index.html" : source === "g" ? "g.html" : "order.html";
    return `${filename}?cart=${encode(read())}#products`;
  }

  global.NoshiCart = Object.freeze({
    read,
    write,
    add,
    updateOptions,
    setQuantity,
    remove,
    clear,
    lines,
    count,
    subtotal,
    originalSubtotal,
    discountTotal,
    encode,
    decode,
    importFromUrl,
    pageSource,
    cartUrl,
    catalogUrl,
  });
})(window);
