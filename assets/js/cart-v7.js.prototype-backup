"use strict";

(function initCartPage() {
  const products = window.NOSHI_PRODUCTS || [];
  const cart = window.NoshiCart;
  if (!cart) return;

  const WHATSAPP_NUMBER = "966576059229";
  const CHECKOUT_KEY = "noshi-checkout-v3";
  const WHATSAPP_PENDING_KEY = "noshi-whatsapp-pending-v1";
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
    back: document.getElementById("backButton"),
    brand: document.getElementById("brandLink"),
    emptyBack: document.getElementById("emptyBackButton"),
    toast: document.getElementById("toast"),
    whatsappConfirm: document.getElementById("whatsappConfirmDialog"),
    confirmSent: document.getElementById("confirmSentButton"),
    confirmEdit: document.getElementById("confirmEditButton"),
    successDialog: document.getElementById("orderSuccessDialog"),
    successClose: document.getElementById("successCloseButton"),
  };

  let toastTimer = null;
  let launchedWhatsAppInThisView = false;
  let pageWasHiddenAfterLaunch = false;

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
    elements.dateInput.value = "";
    elements.timeInput.value = "";
    elements.notes.value = "";
    updatePickerText();
  }

  function restoreCheckout() {
    const state = readCheckout();
    if (DELIVERY[state.delivery]) {
      const radio = document.querySelector(`input[name="delivery"][value="${state.delivery}"]`);
      if (radio) radio.checked = true;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(state.date || "")) elements.dateInput.value = state.date;
    if (allowedTimes.has(state.time)) elements.timeInput.value = state.time;
    elements.notes.value = typeof state.notes === "string" ? state.notes : "";
    updatePickerText();
  }

  function markWhatsAppPending() {
    writeStorage(WHATSAPP_PENDING_KEY, JSON.stringify({ pending: true, createdAt: Date.now() }));
  }

  function hasWhatsAppPending() {
    try {
      const state = JSON.parse(readStorage(WHATSAPP_PENDING_KEY) || "null");
      if (!state?.pending) return false;
      if (Date.now() - Number(state.createdAt || 0) > 12 * 60 * 60 * 1000) {
        removeStorage(WHATSAPP_PENDING_KEY);
        return false;
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearWhatsAppPending() {
    removeStorage(WHATSAPP_PENDING_KEY);
  }

  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  function showWhatsAppConfirmation() {
    if (!hasWhatsAppPending() || !cart.lines().length) {
      if (!cart.lines().length) clearWhatsAppPending();
      return;
    }
    openDialog(elements.whatsappConfirm);
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

    return { valid: invalid.length === 0, first: invalid[0] || null, delivery };
  }

  function buildMessage(delivery) {
    const productLines = cart
      .lines()
      .map(({ product, quantity }) => `• ${product.name} ×${formatNumber(quantity)}`);

    const subtotal = cart.subtotal();
    const discount = cart.discountTotal();
    const total = subtotal + delivery.fee;
    const notes = elements.notes.value.trim();

    return [
      "🧁 *يا نوشي أبغى هالطلب*",
      "",
      "🛍️ *المنتجات:*",
      ...productLines,
      "",
      `🚚 *التوصيل:* ${delivery.label}`,
      `📅 *التاريخ:* ${formatDate(elements.dateInput.value)}`,
      `⏰ *الوقت:* ${formatTime12(elements.timeInput.value)}`,
      ...(notes ? [`📝 *ملاحظات:* ${notes}`] : []),
      "",
      ...(discount > 0 ? [`🏷️ *الخصم:* ${formatNumber(discount)} ر.س`] : []),
      `💰 *الإجمالي النهائي:* ${formatNumber(total)} ر.س`,
      "",
      "✅ الطلب بانتظار تأكيد نوشي بيكري.",
    ].join("\n");
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

  document.querySelectorAll('input[name="delivery"]').forEach((input) => {
    input.addEventListener("change", () => {
      clearError(elements.deliveryError, elements.deliveryGroup);
      saveCheckout();
      render();
    });
  });

  elements.dateInput.addEventListener("input", handleDeliveryDateChange);
  elements.dateInput.addEventListener("change", handleDeliveryDateChange);

  elements.timeInput.addEventListener("change", () => {
    clearError(elements.timeError, elements.timeControl);
    updatePickerText();
    saveCheckout();
  });

  elements.notes.addEventListener("input", saveCheckout);

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
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
    markWhatsAppPending();
    launchedWhatsAppInThisView = true;
    const message = buildMessage(result.delivery);
    window.location.href = `https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
  });

  elements.confirmSent.addEventListener("click", () => {
    clearWhatsAppPending();
    cart.clear();
    clearCheckout();
    closeDialog(elements.whatsappConfirm);
    render();
    openDialog(elements.successDialog);
  });

  elements.confirmEdit.addEventListener("click", () => {
    clearWhatsAppPending();
    closeDialog(elements.whatsappConfirm);
    showToast("تقدرين تعدلين الطلب الآن");
  });

  elements.successClose.addEventListener("click", () => closeDialog(elements.successDialog));
  elements.whatsappConfirm.addEventListener("cancel", (event) => event.preventDefault());
  elements.successDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog(elements.successDialog);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && launchedWhatsAppInThisView) {
      pageWasHiddenAfterLaunch = true;
    }
    if (document.visibilityState === "visible" && pageWasHiddenAfterLaunch) {
      window.setTimeout(showWhatsAppConfirmation, 250);
    }
  });

  window.addEventListener("pageshow", () => {
    window.setTimeout(showWhatsAppConfirmation, 300);
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
