"use strict";

(function initNoshiCart(global) {
  const STORAGE_KEY = "noshi-cart-v3";
  const LEGACY_KEY = "noshi-bakery-cart-v1";
  const products = Array.isArray(global.NOSHI_PRODUCTS) ? global.NOSHI_PRODUCTS : [];
  const productIds = new Set(products.map((product) => product.id));
  const offers = global.NoshiOffers;
  let memoryCart = Object.create(null);

  function normalize(input) {
    const output = Object.create(null);
    if (!input || typeof input !== "object" || Array.isArray(input)) return output;

    Object.entries(input).forEach(([id, rawQuantity]) => {
      const quantity = Math.floor(Number(rawQuantity));
      if (productIds.has(id) && Number.isFinite(quantity) && quantity > 0) {
        output[id] = Math.min(quantity, 99);
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

  function add(productId, amount = 1) {
    if (!productIds.has(productId)) return read();
    const cart = read();
    const increment = Math.max(1, Math.floor(Number(amount) || 1));
    cart[productId] = Math.min((cart[productId] || 0) + increment, 99);
    return write(cart);
  }

  function setQuantity(productId, quantity) {
    if (!productIds.has(productId)) return read();
    const cart = read();
    const safeQuantity = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
    cart[productId] = safeQuantity;
    return write(cart);
  }

  function remove(productId) {
    const cart = read();
    delete cart[productId];
    return write(cart);
  }

  function clear() {
    return write(Object.create(null));
  }

  function lines() {
    const cart = read();
    return products
      .filter((product) => cart[product.id])
      .map((product) => {
        const quantity = cart[product.id];
        const pricing = offers?.pricingFor(product) || {
          originalPrice: Number(product.price || 0),
          finalPrice: Number(product.price || 0),
          percent: 0,
          hasOffer: false,
        };
        const originalLineTotal = pricing.originalPrice * quantity;
        const lineTotal = pricing.finalPrice * quantity;
        return {
          product,
          quantity,
          unitPrice: pricing.finalPrice,
          originalUnitPrice: pricing.originalPrice,
          discountPercent: pricing.percent,
          hasOffer: pricing.hasOffer,
          originalLineTotal,
          lineTotal,
          discountAmount: originalLineTotal - lineTotal,
        };
      });
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
