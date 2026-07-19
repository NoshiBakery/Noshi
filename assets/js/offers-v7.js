"use strict";

/*
  إعداد الخصومات:

  خصم على جميع المنتجات:
  { target: "all", percent: 15, active: true }

  خصم على منتج محدد بالمعرّف (الطريقة المفضلة):
  { target: "p07", percent: 20, active: true } // كيكة ليمون

  ويمكن استخدام اسم المنتج نفسه:
  { target: "كيكة ليمون", percent: 20, active: true }

  ملاحظة: خصم المنتج المحدد يتقدم على الخصم العام، ولا يتم جمع الخصمين معًا.
*/
window.NOSHI_OFFERS = Object.freeze([
  // { target: "all", percent: 15, active: true },
  { target: "p01", percent: 15, active: true },
 // { target: "p04", percent: 20, active: true },
]);

(function initNoshiOffers(global) {
  const rules = Array.isArray(global.NOSHI_OFFERS) ? global.NOSHI_OFFERS : [];

  function normalizePercent(value) {
    const percent = Number(value);
    if (!Number.isFinite(percent)) return 0;
    return Math.max(0, Math.min(100, percent));
  }

  function normalizedRules() {
    return rules
      .filter((rule) => rule && rule.active !== false)
      .map((rule) => ({
        target: String(rule.target ?? "").trim(),
        percent: normalizePercent(rule.percent),
      }))
      .filter((rule) => rule.target && rule.percent > 0);
  }

  function ruleFor(product) {
    if (!product) return null;
    const activeRules = normalizedRules();
    const specific = activeRules.find(
      (rule) =>
        rule.target !== "all" && (rule.target === product.id || rule.target === product.name),
    );
    return specific || activeRules.find((rule) => rule.target === "all") || null;
  }

  function pricingFor(product) {
    const originalPrice = Number(product?.price || 0);
    const rule = ruleFor(product);
    const percent = rule?.percent || 0;
    const finalPrice =
      percent > 0 ? Math.round(originalPrice * (1 - percent / 100) * 100) / 100 : originalPrice;

    return Object.freeze({
      originalPrice,
      finalPrice,
      percent,
      hasOffer: percent > 0 && finalPrice < originalPrice,
      target: rule?.target || "",
    });
  }

  global.NoshiOffers = Object.freeze({ ruleFor, pricingFor });
})(window);
