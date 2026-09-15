"use strict";

/*
  إعداد الخصومات:

  خصم على جميع المنتجات:
  { target: "all", percent: 15, active: true }

  خصم على منتج محدد:
  { target: "p07", percent: 20, active: true }

  خصم على حجم محدد من الخلايا:
  { target: "p18:small", percent: 7.285714285714, active: true }
  { target: "p18:medium", percent: 10, active: true }

  خصم الحجم يتقدم على خصم المنتج، وخصم المنتج يتقدم على الخصم العام.
*/
window.NOSHI_OFFERS = Object.freeze([
  // { target: "all", percent: 15, active: true },
  { target: "p01", percent: 15, active: false },
]);

(function initNoshiOffers(global) {
  const rules = Array.isArray(global.NOSHI_OFFERS) ? global.NOSHI_OFFERS : [];

  function normalizePercent(value) {
    const percent = Number(value);
    if (!Number.isFinite(percent)) return 0;
    return Math.max(0, Math.min(100, percent));
  }

  function normalizedRules() {
    return rules.filter((rule) => rule && rule.active !== false).map((rule) => ({
      target: String(rule.target ?? "").trim(),
      percent: normalizePercent(rule.percent),
    })).filter((rule) => rule.target && rule.percent > 0);
  }

  function ruleFor(product, variantId = "") {
    if (!product) return null;
    const activeRules = normalizedRules();
    const variantTarget = variantId ? `${product.id}:${variantId}` : "";
    const variantRule = variantTarget ? activeRules.find((rule) => rule.target === variantTarget) : null;
    const productRule = activeRules.find((rule) =>
      rule.target !== "all" && (rule.target === product.id || rule.target === product.name)
    );
    return variantRule || productRule || activeRules.find((rule) => rule.target === "all") || null;
  }

  function pricingFor(product, variantId = "") {
    const variant = Array.isArray(product?.variants)
      ? product.variants.find((item) => item.id === variantId)
      : null;
    const originalPrice = Number(variant?.price ?? product?.price ?? 0);
    const rule = ruleFor(product, variantId);
    const percent = rule?.percent || 0;
    const finalPrice = percent > 0
      ? Math.round(originalPrice * (1 - percent / 100) * 100) / 100
      : originalPrice;
    return Object.freeze({ originalPrice, finalPrice, percent, hasOffer: percent > 0 && finalPrice < originalPrice, target: rule?.target || "" });
  }

  global.NoshiOffers = Object.freeze({ ruleFor, pricingFor });
})(window);
