"use strict";

(function initCartPage() {
  const products = window.NOSHI_PRODUCTS || [];
  const cart = window.NoshiCart;
  if (!cart) return;

  const WHATSAPP_NUMBER = "966576059229";
  const CHECKOUT_KEY = "noshi-checkout-v4";
  const IDEMPOTENCY_KEY = "noshi-order-idempotency-v1";
  const ORDER_API_URL = String(window.NOSHI_ORDER_API_URL || "").trim();
  const DELIVERY = Object.freeze({
    inside: { label: "داخل المذنب", fee: 10 },
    outside: { label: "خارج المذنب", fee: 25 },
  });

  const params = new URLSearchParams(window.location.search);
  const source = ["index", "order", "g"].includes(params.get("from"))
    ? params.get("from")
    : "order";
  cart.importFromUrl();

  const elements = {
    items: document.getElementById("cartItems"),
    empty: document.getElementById("emptyState"),
    form: document.getElementById("checkoutForm"),
    phoneSection: document.getElementById("phoneSection"),
    phoneField: document.getElementById("phoneField"),
    phone: document.getElementById("customerPhone"),
    phoneError: document.getElementById("phoneError"),
    count: document.getElementById("cartCount"),
    subtotalLabel: document.getElementById("subtotalLabel"),
    subtotal: document.getElementById("subtotal"),
    discountRow: document.getElementById("discountRow"),
    discountAmount: document.getElementById("discountAmount"),
    deliveryFee: document.getElementById("deliveryFee"),
    grandTotal: document.getElementById("grandTotal"),
    deliveryGroup: document.getElementById("deliveryGroup"),
    deliveryError: document.getElementById("deliveryError"),
    deliverySection: document.getElementById("deliverySection"),
    dateField: document.getElementById("dateField"),
    dateControl: document.getElementById("dateControl"),
    dateInput: document.getElementById("deliveryDate"),
    dateText: document.getElementById("dateText"),
    dateError: document.getElementById("dateError"),
    timeField: document.getElementById("timeField"),
    timeControl: document.getElementById("timeControl"),
    timeInput: document.getElementById("deliveryTime"),
    timeError: document.getElementById("timeError"),
    notes: document.getElementById("notes"),
    formMessage: document.getElementById("formMessage"),
    submit: document.getElementById("submitButton"),
    submitText: document.getElementById("submitButtonText"),
    back: document.getElementById("backButton"),
    brand: document.getElementById("brandLink"),
    emptyBack: document.getElementById("emptyBackButton"),
    toast: document.getElementById("toast"),
    successDialog: document.getElementById("orderSuccessDialog"),
    successMain: document.getElementById("orderSuccessMain"),
    thanksPanel: document.getElementById("orderThanksPanel"),
    thanksClose: document.getElementById("thanksCloseButton"),
    successOrderNumber: document.getElementById("successOrderNumber"),
    successWhatsApp: document.getElementById("successWhatsAppButton"),
    whatsAppCountdown: document.getElementById("whatsAppCountdown"),
    whatsAppCountdownText: document.getElementById("whatsAppCountdownText"),
    whatsAppCountdownBar: document.getElementById("whatsAppCountdownBar"),
  };

  let toastTimer = null;
  let lastWhatsAppUrl = "";
  let whatsAppCountdownTimer = null;
  let submitting = false;


  function stopWhatsAppCountdown() {
    if (whatsAppCountdownTimer) {
      window.clearInterval(whatsAppCountdownTimer);
      whatsAppCountdownTimer = null;
    }
  }

  function showThanksPanel() {
    if (elements.successMain) elements.successMain.hidden = true;
    if (elements.thanksPanel) elements.thanksPanel.hidden = false;
  }

  function resetSuccessDialog() {
    if (elements.successMain) elements.successMain.hidden = false;
    if (elements.thanksPanel) elements.thanksPanel.hidden = true;
  }

  function openWhatsApp() {
    stopWhatsAppCountdown();
    showThanksPanel();
    if (lastWhatsAppUrl) window.location.href = lastWhatsAppUrl;
  }

  function startWhatsAppCountdown(seconds = 10) {
    stopWhatsAppCountdown();
    let remaining = seconds;

    if (elements.whatsAppCountdownBar) {
      elements.whatsAppCountdownBar.style.transition = "none";
      elements.whatsAppCountdownBar.style.transform = "scaleX(1)";
      void elements.whatsAppCountdownBar.offsetWidth;
      elements.whatsAppCountdownBar.style.transition = `transform ${seconds}s linear`;
      elements.whatsAppCountdownBar.style.transform = "scaleX(0)";
    }

    const renderCountdown = () => {
      if (elements.whatsAppCountdown) elements.whatsAppCountdown.textContent = String(Math.max(remaining, 0));
      if (elements.whatsAppCountdownText) elements.whatsAppCountdownText.textContent = String(Math.max(remaining, 0));
    };

    renderCountdown();
    whatsAppCountdownTimer = window.setInterval(() => {
      remaining -= 1;
      renderCountdown();

      if (remaining <= 0) {
        openWhatsApp();
      }
    }, 1000);
  }

  function englishDigits(value) {
    return String(value ?? "")
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  function formatMoney(value) {
    return `${formatNumber(value)} ريال`;
  }

  function formatDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return "";
    return `${match[1]}/${Number(match[2])}/${Number(match[3])}`;
  }

  function formatTime12(value) {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
    if (!match) return "";
    const hour24 = Number(match[1]);
    const minutes = match[2];
    const period = hour24 < 12 ? "صباحًا" : "مساءً";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${minutes} ${period}`;
  }

  function availableTimes() {
    const values = [];
    for (let minutes = 6 * 60; minutes <= 23 * 60 + 30; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      values.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
    values.push("00:00");
    return values;
  }

  const allowedTimes = new Set(availableTimes());

  function populateTimeOptions() {
    const current = elements.timeInput.value;
    const selectedDate = elements.dateInput.value;
    const today = localToday();
    const nowMinutes = currentTimeInMinutes();

    elements.timeInput.replaceChildren(new Option("اختاري الوقت", ""));

    availableTimes().forEach((value) => {
      const optionMinutes = timeToMinutes(value);

      const isExpiredToday = selectedDate === today && optionMinutes <= nowMinutes;

      const label = isExpiredToday ? `${formatTime12(value)} — انتهى` : formatTime12(value);

      const option = new Option(label, value);

      // يقفل الوقت المنتهي ويمنع الضغط عليه
      option.disabled = isExpiredToday;

      elements.timeInput.add(option);
    });

    // يعيد الوقت السابق فقط إذا ما زال متاحًا
    if (current && isDeliveryTimeAvailable(current)) {
      elements.timeInput.value = current;
    } else {
      elements.timeInput.value = "";
    }

    updatePickerText();
  }

  function localToday() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function timeToMinutes(value) {
    if (!value) return -1;

    const [hour, minute] = value.split(":").map(Number);

    // نعتبر 12:00 صباحًا نهاية اليوم، وليس بدايته
    if (hour === 0 && minute === 0) {
      return 24 * 60;
    }

    return hour * 60 + minute;
  }

  function currentTimeInMinutes() {
    const now = new Date();

    return now.getHours() * 60 + now.getMinutes();
  }

  function isDeliveryTimeAvailable(value) {
    if (!allowedTimes.has(value)) return false;

    const selectedDate = elements.dateInput.value;
    const today = localToday();

    // لا يوجد تاريخ مختار
    if (!selectedDate) return true;

    // التاريخ قديم
    if (selectedDate < today) return false;

    // التاريخ يوم قادم، إذًا جميع الأوقات متاحة
    if (selectedDate > today) return true;

    // التاريخ هو اليوم: يجب أن يكون الوقت قادمًا
    return timeToMinutes(value) > currentTimeInMinutes();
  }

  function enforceDeliveryDate() {
    const today = localToday();
    const selectedDate = elements.dateInput.value;

    elements.dateInput.min = today;
    elements.dateInput.setAttribute("min", today);

    if (!selectedDate) {
      updatePickerText();
      saveCheckout();
      return true;
    }

    if (selectedDate < today) {
      elements.dateInput.value = "";

      updatePickerText();

      setError(
        elements.dateError,
        elements.dateControl,
        "لا يمكن اختيار تاريخ سابق، اختاري اليوم أو يومًا قادمًا.",
      );

      saveCheckout();
      return false;
    }

    clearError(elements.dateError, elements.dateControl);
    updatePickerText();
    saveCheckout();

    return true;
  }

  function handleDeliveryDateChange() {
    const validDate = enforceDeliveryDate();

    // مهم: نعيد بناء القائمة كلما تغير التاريخ.
    // اليوم: نقفل الأوقات المنتهية.
    // يوم قادم: نفتح جميع الأوقات.
    populateTimeOptions();

    if (
      validDate &&
      elements.timeInput.value &&
      isDeliveryTimeAvailable(elements.timeInput.value)
    ) {
      clearError(elements.timeError, elements.timeControl);
    }

    saveCheckout();
    resetIdempotency();
  }

  function selectedDelivery() {
    const checked = document.querySelector('input[name="delivery"]:checked');
    return checked ? DELIVERY[checked.value] || null : null;
  }

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      try {
        return sessionStorage.getItem(key);
      } catch (_) {
        return null;
      }
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      try {
        sessionStorage.setItem(key, value);
      } catch (_) {
        /* no-op */
      }
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {
      /* no-op */
    }
    try {
      sessionStorage.removeItem(key);
    } catch (_) {
      /* no-op */
    }
  }

  function readCheckout() {
    try {
      return JSON.parse(readStorage(CHECKOUT_KEY) || "{}") || {};
    } catch (_) {
      return {};
    }
  }

  function saveCheckout() {
    const checked = document.querySelector('input[name="delivery"]:checked');
    writeStorage(
      CHECKOUT_KEY,
      JSON.stringify({
        phone: elements.phone.value,
        delivery: checked?.value || "",
        date: elements.dateInput.value,
        time: elements.timeInput.value,
        notes: elements.notes.value,
      }),
    );
  }

  function clearCheckout() {
    removeStorage(CHECKOUT_KEY);
    document.querySelectorAll('input[name="delivery"]').forEach((input) => {
      input.checked = false;
    });
    elements.phone.value = "";
    elements.dateInput.value = "";
    elements.timeInput.value = "";
    elements.notes.value = "";
    updatePickerText();
  }

  function restoreCheckout() {
    const state = readCheckout();
    elements.phone.value = typeof state.phone === "string" ? state.phone : "";
    if (DELIVERY[state.delivery]) {
      const radio = document.querySelector(`input[name="delivery"][value="${state.delivery}"]`);
      if (radio) radio.checked = true;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(state.date || "")) elements.dateInput.value = state.date;
    if (allowedTimes.has(state.time)) elements.timeInput.value = state.time;
    elements.notes.value = typeof state.notes === "string" ? state.notes : "";
    updatePickerText();
  }

  function normalizePhone(value) {
    let digits = englishDigits(value).replace(/\D/g, "");
    if (digits.startsWith("00966")) digits = digits.slice(2);
    if (digits.startsWith("966")) digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);
    if (!/^5\d{8}$/.test(digits)) return "";
    return `966${digits}`;
  }

  function resetIdempotency() {
    removeStorage(IDEMPOTENCY_KEY);
  }

  function getIdempotencyKey(fingerprint) {
    try {
      const existing = JSON.parse(readStorage(IDEMPOTENCY_KEY) || "null");
      if (existing?.key && existing?.fingerprint === fingerprint) return existing.key;
    } catch (_) {
      /* create a fresh key below */
    }
    const key = globalThis.crypto?.randomUUID?.() || `noshi-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    writeStorage(IDEMPOTENCY_KEY, JSON.stringify({ key, fingerprint }));
    return key;
  }

  function apiConfigured() {
    return /^https:\/\//i.test(ORDER_API_URL) && !ORDER_API_URL.includes("REPLACE-WITH-YOUR-WORKER");
  }

  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 1800);
  }

  function updateNavigation() {
    const href = cart.catalogUrl(source);
    elements.back.href = href;
    elements.brand.href = href;
    elements.emptyBack.href = href;

    const next = `cart.html?from=${encodeURIComponent(source)}&cart=${cart.encode(cart.read())}`;
    try {
      history.replaceState(null, "", next);
    } catch (_) {
      /* file URLs may reject it */
    }
  }

  function priceMeta(line) {
    if (!line.hasOffer) return formatMoney(line.unitPrice);
    return `<span class="old-unit-price">${formatMoney(line.originalUnitPrice)}</span> <span class="sale-unit-price">${formatMoney(line.unitPrice)}</span> <span class="discount-chip">خصم ${formatNumber(line.discountPercent)}%</span>`;
  }

  function itemMarkup(line) {
    const { product, quantity, lineTotal } = line;
    const size = product.showSize && product.size ? ` · ${englishDigits(product.size)}` : "";
    return `
      <article class="cart-item" data-product-id="${product.id}">
        <img class="item-image" src="${product.image}" width="64" height="64" alt="صورة ${product.name}" />
        <div class="item-content">
          <div class="item-top">
            <div style="min-width:0">
              <div class="item-name">${product.name}</div>
              <div class="item-meta">${priceMeta(line)}${size}</div>
            </div>
            <button class="remove-button" type="button" data-action="remove" data-id="${product.id}">حذف</button>
          </div>
          <div class="item-bottom">
            <div class="quantity" aria-label="كمية ${product.name}">
              <button type="button" data-action="decrease" data-id="${product.id}" ${quantity <= 1 ? "disabled" : ""} aria-label="تقليل الكمية">−</button>
              <output>${formatNumber(quantity)}</output>
              <button type="button" data-action="increase" data-id="${product.id}" aria-label="زيادة الكمية">+</button>
            </div>
            <strong class="item-total">${formatMoney(lineTotal)}</strong>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const lines = cart.lines();
    const count = cart.count();
    const subtotal = cart.subtotal();
    const originalSubtotal = cart.originalSubtotal();
    const discount = cart.discountTotal();
    const delivery = selectedDelivery();
    const fee = delivery?.fee || 0;

    elements.count.textContent = formatNumber(count);
    elements.items.innerHTML = lines.map(itemMarkup).join("");
    elements.empty.hidden = lines.length > 0;
    elements.items.hidden = lines.length === 0;
    elements.form.hidden = lines.length === 0;
    elements.subtotalLabel.textContent = discount > 0 ? "المنتجات قبل الخصم" : "مجموع المنتجات";
    elements.subtotal.textContent = formatMoney(discount > 0 ? originalSubtotal : subtotal);
    elements.discountRow.hidden = discount <= 0;
    elements.discountAmount.textContent = `− ${formatMoney(discount)}`;
    elements.deliveryFee.textContent = delivery ? formatMoney(fee) : "لم يُحدد";
    elements.grandTotal.textContent = formatMoney(subtotal + fee);
    elements.submit.disabled = lines.length === 0;
    updateNavigation();
  }

  function updatePickerText() {
    const dateValue = formatDate(elements.dateInput.value);
    elements.dateText.textContent = dateValue || "اختاري التاريخ";
    elements.dateControl.classList.toggle("has-value", Boolean(dateValue));
    elements.timeControl.classList.toggle("has-value", Boolean(elements.timeInput.value));
  }

  function clearError(error, control) {
    error.textContent = "";
    control.classList.remove("invalid");
    control.removeAttribute("aria-invalid");
  }

  function setError(error, control, message) {
    error.textContent = message;
    control.classList.add("invalid");
    control.setAttribute("aria-invalid", "true");
  }

  function validate() {
    const invalid = [];
    const delivery = selectedDelivery();
    const phone = normalizePhone(elements.phone.value);

    if (!phone) {
      setError(elements.phoneError, elements.phone, "اكتبي رقم جوال سعودي صحيح، مثل 05XXXXXXXX.");
      invalid.push(elements.phoneSection);
    } else clearError(elements.phoneError, elements.phone);

    if (!delivery) {
      setError(elements.deliveryError, elements.deliveryGroup, "اختاري نطاق التوصيل.");
      invalid.push(elements.deliverySection);
    } else clearError(elements.deliveryError, elements.deliveryGroup);

    if (!elements.dateInput.value) {
      setError(elements.dateError, elements.dateControl, "اختاري تاريخ التوصيل.");
      invalid.push(elements.dateField);
    } else if (elements.dateInput.value < localToday()) {
      setError(elements.dateError, elements.dateControl, "التاريخ يجب أن يكون اليوم أو بعده.");
      invalid.push(elements.dateField);
    } else clearError(elements.dateError, elements.dateControl);

    if (!allowedTimes.has(elements.timeInput.value)) {
      setError(elements.timeError, elements.timeControl, "اختاري وقت التوصيل.");
      invalid.push(elements.timeField);
    } else if (!isDeliveryTimeAvailable(elements.timeInput.value)) {
      setError(elements.timeError, elements.timeControl, "هذا الوقت انتهى، اختاري وقتًا لاحقًا.");
      invalid.push(elements.timeField);
    } else {
      clearError(elements.timeError, elements.timeControl);
    }

    return { valid: invalid.length === 0, first: invalid[0] || null, delivery, phone };
  }

  function buildMessage(orderNumber) {
    return [
      "السلام عليكم 🧁",
      "لدي طلب من نوشي وأرغب بمتابعته.",
      "",
      `رقم الطلب: #${orderNumber}`,
    ].join("\n");
  }

  function setSubmitting(active) {
    submitting = active;
    elements.submit.disabled = active || !cart.lines().length;
    elements.submit.classList.toggle("is-loading", active);
    elements.submitText.textContent = active ? "جاري اعتماد الطلب..." : "اعتماد الطلب";
  }

  function orderPayload(result) {
    const payload = {
      phone: result.phone,
      delivery: document.querySelector('input[name="delivery"]:checked')?.value || "",
      deliveryDate: elements.dateInput.value,
      deliveryTime: elements.timeInput.value,
      notes: elements.notes.value.trim(),
      items: cart.lines().map((line) => ({
        productId: line.product.id,
        quantity: line.quantity,
      })),
    };
    const fingerprint = JSON.stringify(payload);
    return { idempotencyKey: getIdempotencyKey(fingerprint), ...payload };
  }

  async function createOrder(result) {
    if (!apiConfigured()) throw new Error("ORDER_API_NOT_CONFIGURED");
    const response = await fetch(ORDER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload(result)),
    });

    let data = null;
    try { data = await response.json(); } catch (_) { /* no-op */ }
    if (!response.ok || !data?.success || !data?.orderNumber) {
      const message = data?.message || data?.error || `HTTP_${response.status}`;
      throw new Error(message);
    }
    return data;
  }

  elements.items.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = button.dataset.id;
    const current = cart.read()[id] || 0;
    if (button.dataset.action === "increase") cart.setQuantity(id, current + 1);
    if (button.dataset.action === "decrease" && current > 1) cart.setQuantity(id, current - 1);
    if (button.dataset.action === "remove") {
      const product = products.find((item) => item.id === id);
      cart.remove(id);
      if (product) showToast(`تم حذف ${product.name}`);
    }
    render();
  });

  elements.phone.addEventListener("input", () => {
    clearError(elements.phoneError, elements.phone);
    saveCheckout();
    resetIdempotency();
  });

  document.querySelectorAll('input[name="delivery"]').forEach((input) => {
    input.addEventListener("change", () => {
      clearError(elements.deliveryError, elements.deliveryGroup);
      saveCheckout();
      resetIdempotency();
      render();
    });
  });

  elements.dateInput.addEventListener("input", handleDeliveryDateChange);
  elements.dateInput.addEventListener("change", handleDeliveryDateChange);

  elements.timeInput.addEventListener("change", () => {
    clearError(elements.timeError, elements.timeControl);
    updatePickerText();
    saveCheckout();
    resetIdempotency();
  });

  elements.notes.addEventListener("input", () => { saveCheckout(); resetIdempotency(); });

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    elements.formMessage.textContent = "";

    if (!cart.lines().length) {
      elements.formMessage.textContent = "السلة فارغة.";
      return;
    }

    const result = validate();
    if (!result.valid) {
      result.first.scrollIntoView({ behavior: "smooth", block: "center" });
      result.first.classList.remove("attention");
      void result.first.offsetWidth;
      result.first.classList.add("attention");
      return;
    }

    saveCheckout();
    setSubmitting(true);

    try {
      const data = await createOrder(result);
      const orderNumber = String(data.orderNumber);
      const message = buildMessage(orderNumber);
      lastWhatsAppUrl = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;

      elements.successOrderNumber.textContent = `#${orderNumber}`;
      cart.clear();
      clearCheckout();
      resetIdempotency();
      render();
      resetSuccessDialog();
      openDialog(elements.successDialog);
      startWhatsAppCountdown(10);
    } catch (error) {
      console.error("Noshi order error", error);
      if (error?.message === "ORDER_API_NOT_CONFIGURED") {
        elements.formMessage.textContent = "نسخة الطلبات التجريبية تحتاج وضع رابط Cloudflare Worker أولًا.";
      } else {
        elements.formMessage.textContent = "تعذر اعتماد الطلب الآن. لم يتم تفريغ السلة؛ حاولي مرة أخرى.";
      }
      setSubmitting(false);
    }
  });

  elements.successWhatsApp.addEventListener("click", openWhatsApp);

  if (elements.thanksClose) {
    elements.thanksClose.addEventListener("click", () => {
      stopWhatsAppCountdown();
      if (elements.successDialog?.open) elements.successDialog.close();
    });
  }

  elements.successDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
  });

  const today = localToday();

  // إغلاق التواريخ السابقة
  elements.dateInput.min = today;
  elements.dateInput.setAttribute("min", today);

  // نبني القائمة أولًا حتى يمكن استعادة الوقت المحفوظ.
  populateTimeOptions();
  restoreCheckout();

  // يتحقق من التاريخ المحفوظ، ثم يعيد بناء الأوقات حسب التاريخ:
  // اليوم = إغلاق الأوقات المنتهية، يوم قادم = جميع الأوقات متاحة.
  enforceDeliveryDate();
  populateTimeOptions();

  render();
})();
