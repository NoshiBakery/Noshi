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

  { target: "p01", percent: 7.753846153846, active: true },
{ target: "p02", percent: 7.753846153846, active: true },
{ target: "p03", percent: 5.368421052632, active: true },
{ target: "p04", percent: 6.755555555556, active: true },
{ target: "p05", percent: 10.08, active: true },
{ target: "p06", percent: 8.444444444444, active: true },
{ target: "p07", percent: 6, active: true },
{ target: "p08", percent: 8, active: true },
{ target: "p09", percent: 8.977777777778, active: true },
{ target: "p10", percent: 8.4, active: true },
{ target: "p11", percent: 10.08, active: true },
{ target: "p12", percent: 8.4, active: true },
{ target: "p13", percent: 8.977777777778, active: true },
{ target: "p14", percent: 10.358974358974, active: true },
{ target: "p15", percent: 10.08, active: true },
{ target: "p16", percent: 10.066666666667, active: true },
{ target: "p17", percent: 8.977777777778, active: true },
{ target: "p18:small", percent: 7.285714285714, active: true },
{ target: "p18:medium", percent: 8, active: true },
{ target: "p19:small", percent: 7.285714285714, active: true },
{ target: "p19:medium", percent: 8, active: true },
{ target: "p20:small", percent: 7.285714285714, active: true },
{ target: "p20:medium", percent: 8, active: true },
{ target: "p21", percent: 10.066666666667, active: true },
{ target: "p22", percent: 10.066666666667, active: true },
{ target: "p23", percent: 7.6, active: true },
{ target: "p24", percent: 10.066666666667, active: true },
{ target: "p25", percent: 10.066666666667, active: true },
{ target: "p26", percent: 10.08, active: true },
{ target: "p27", percent: 10.08, active: true },
{ target: "p28", percent: 10.066666666667, active: true },
{ target: "p29", percent: 9.163636363636, active: true },
{ target: "p30", percent: 16.08, active: true },
{ target: "p31", percent: 9.386666666667, active: true },
{ target: "p32", percent: 2.8, active: true },
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
