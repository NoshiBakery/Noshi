"use strict";

// NOSHI product options: read only the existing product catalog, never checkout-supplied prices.
(function (global) {
  const FLOUR = Object.freeze({
    flour: Object.freeze({white:"دقيق أبيض",bran:"دقيق بر",mix:"دقيق مكس"}),
    cake: Object.freeze({white:"عادية",bran:"بر",mix:"مكس"}),
    tawa: Object.freeze({white:"عادية",bran:"بر",mix:"مكس"})
  });
  const SUGAR = Object.freeze({balanced:"سكر موزون",reduced:"تقليل السكر"});
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;

  function config(product) {
    const choices = Array.isArray(product?.flourChoices) ? product.flourChoices : [];
    const kind = FLOUR[product?.flourStyle] ? product.flourStyle : "flour";
    const extras = product?.flourExtras && typeof product.flourExtras === "object" ? product.flourExtras : {};
    const valid = choices.length <= 3 && new Set(choices).size === choices.length &&
      choices.every(id => Object.hasOwn(FLOUR.flour, id)) &&
      Object.entries(extras).every(([id, price]) => choices.includes(id) &&
        Number.isFinite(price) && price >= 0 && price <= 10000 && round(price) === price);
    return {choices:valid ? choices : [], kind, extras, sugarRequired:product?.sugarRequired === true, configurationValid:valid};
  }
  function flourLabel(product, id) {
    return FLOUR[config(product).kind][id] || "";
  }
  function sugarLabel(id) { return SUGAR[id] || ""; }
  function extraPrice(product, id) {
    const cfg = config(product);
    return cfg.choices.includes(id) ? round(Number(cfg.extras[id] || 0)) : 0;
  }
  function defaults(product) {
    const cfg = config(product);
    return {flourId:cfg.choices.length === 1 ? cfg.choices[0] : "",sugarId:""};
  }
  function validSelection(product, flourId = "", sugarId = "") {
    const cfg = config(product);
    return cfg.configurationValid &&
      (!cfg.choices.length ? !flourId : cfg.choices.includes(flourId)) &&
      (cfg.sugarRequired ? Object.hasOwn(SUGAR, sugarId) : !sugarId);
  }
  function isHealthy(product) {
    return config(product).choices.some(id => id === "bran" || id === "mix");
  }
  function summary(product, flourId, sugarId) {
    return [flourId ? `نوع الدقيق: ${flourLabel(product,flourId)}` : "",
      sugarId ? `مستوى السكر: ${sugarLabel(sugarId)}` : ""].filter(Boolean);
  }
  global.NoshiProductOptions = Object.freeze({config,flourLabel,sugarLabel,extraPrice,defaults,validSelection,isHealthy,summary,round});
})(window);
