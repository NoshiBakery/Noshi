"use strict";

(function initCartPage() {
  const products = window.NOSHI_PRODUCTS || [];
  const cart = window.NoshiCart;
  if (!cart) return;

  const WHATSAPP_NUMBER = "966576059229";
  const CHECKOUT_KEY = "noshi-checkout-v4";
  const GIFT_DRAFT_KEY = "noshi-gift-draft-v1";
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
    couponSection: document.getElementById("couponSection"),
    couponInput: document.getElementById("couponInput"),
    couponApply: document.getElementById("couponApply"),
    couponRemove: document.getElementById("couponRemove"),
    couponMessage: document.getElementById("couponMessage"),
    couponDiscountRow: document.getElementById("couponDiscountRow"),
    couponDiscountAmount: document.getElementById("couponDiscountAmount"),
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
  const gift = {
    enabled: document.getElementById("giftEnabled"), fields: document.getElementById("giftFields"),
    sender: document.getElementById("giftSenderName"), senderPhone: document.getElementById("giftSenderPhone"),
    recipient: document.getElementById("giftRecipientName"), recipientPhone: document.getElementById("giftRecipientPhone"),
    message: document.getElementById("giftMessage"),
    consent: document.getElementById("giftConsent"), error: document.getElementById("giftError"),
    hint: document.getElementById("giftScheduleHint")
  };
  const suggestedGiftMessage = () => {
    const recipient = gift.recipient.value.trim().slice(0, 80) || "الغالية";
    const sender = gift.sender.value.trim().slice(0, 80) || "مُهدية تحبّك";
    return `من قلب يحبّك، إلى قلب يستحق الفرح 💗\nلأنك غالية يا ${recipient}، ولأن وجودك يضيف للدنيا حلاوة، هذي هدية صغيرة محمّلة بكثير من المحبة.\nعسى أيامك كلها فرح وجمال، مثل قلبك. 🌸\nمن ${sender} 💕`;
  };
  let lastSuggested = "", messageEdited = false;
  let savedSuggestedMessage = null, savedCustomMessage = "";
  let currentMessageMode = "suggested";

  function updateSuggestedMessage() {
    if (document.querySelector('input[name="giftMessageMode"]:checked')?.value !== "suggested") return;
    const next = suggestedGiftMessage();
    if (!messageEdited || gift.message.value === lastSuggested) {
      gift.message.value = next;
      messageEdited = false;
    } else if (lastSuggested) {
      // If she edited the suggested wording, update the sender's closing line only.
      // Never overwrite the rest of her message or move the caret while she types.
      const previousSignature = lastSuggested.split("\n").at(-1);
      const nextSignature = next.split("\n").at(-1);
      if (gift.message.value.includes(previousSignature)) {
        gift.message.value = gift.message.value.replace(previousSignature, nextSignature);
      }
    }
    lastSuggested = next;
  }
  updateSuggestedMessage();
  const giftMode = () => document.querySelector('input[name="giftScheduleMode"]:checked')?.value || "";
  const giftTheme = () => document.querySelector('input[name="giftTheme"]:checked')?.value || "";
  const giftPreviewDialog = document.getElementById("giftPreviewDialog");
  const giftPreviewFrame = document.getElementById("giftPreviewFrame");
  let previewTheme = "rose";
  const previewNonce = crypto.randomUUID();
  function syncGift() {
    const on = gift.enabled.checked;
    gift.fields.hidden = !on;
    elements.phoneSection.hidden = on;
    document.body.classList.toggle("gift-checkout", on);
    // Keep the message available before recipient details are entered.
    document.getElementById("giftMessageStep").hidden = !on;
    document.getElementById("giftThemeStep").hidden = !on;
    document.getElementById("giftScheduleStep").hidden = !on;
    document.getElementById("scheduleSection").hidden = on && giftMode() !== "sender";
    updateSuggestedMessage();
    gift.hint.textContent = giftMode() === "sender" ? "بنرسل هديتك للمستلمة، ونتأكد معها إذا الموعد اللي اخترتيه يناسبها قبل تأكيد التوصيل." : giftMode() === "recipient" ? "💌 خلّي الباقي علينا! بنرسل رابط الهدية للمستلمة، وهي تختار التاريخ والوقت اللي يناسبانها." : "";
    if (on && !gift.senderPhone.value.trim() && elements.phone.value.trim()) gift.senderPhone.value = elements.phone.value;
    if (on) elements.phone.value = gift.senderPhone.value;
    document.getElementById("giftPreviewSelected").disabled = !giftTheme();
  }
  function previewPayload(theme) {
    return {
      theme,
      senderName: gift.sender.value.trim() || "شخص غالٍ عليكِ",
      recipientName: gift.recipient.value.trim() || "يا جميلة",
      message: gift.message.value.trim() || suggestedGiftMessage(),
      scheduleMode: giftMode(),
      proposedDate: giftMode() === "sender" ? elements.dateInput.value : "",
      proposedTime: giftMode() === "sender" ? elements.timeInput.value : "",
      // Do not pass prices, phone numbers, or payment fields to the preview iframe.
      items: cart.lines().map(line => ({
        productId: line.product.id, name: line.variant ? `${line.product.name} — ${line.variant.name}` : line.product.name,
        quantity: line.quantity, description: line.product.description || "", image: line.product.image || ""
      }))
    };
  }
  function sendGiftPreview() {
    if (!giftPreviewFrame.contentWindow || giftPreviewFrame.src === "about:blank") return;
    giftPreviewFrame.contentWindow.postMessage({type: "NOSHI_GIFT_PREVIEW", nonce: previewNonce, gift: previewPayload(previewTheme)}, window.location.origin);
  }
  function selectPreviewTheme(theme) {
    previewTheme = theme;
    document.querySelectorAll('[data-preview-theme]').forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.previewTheme === theme));
    });
    sendGiftPreview();
  }
  function openGiftPreview(theme) {
    if (!cart.lines().length) return;
    selectPreviewTheme(theme);
    if (!giftPreviewDialog.open) giftPreviewDialog.showModal();
    if (!giftPreviewFrame.src.includes(`gift.html?preview=1&nonce=${encodeURIComponent(previewNonce)}`)) giftPreviewFrame.src = `gift.html?preview=1&nonce=${encodeURIComponent(previewNonce)}`;
    else sendGiftPreview();
  }
  giftPreviewFrame.addEventListener("load", sendGiftPreview);
  giftPreviewDialog.addEventListener("close", () => {giftPreviewFrame.src = "about:blank";});
  document.getElementById("giftPreviewClose").addEventListener("click", () => giftPreviewDialog.close());
  document.getElementById("giftPreviewUse").addEventListener("click", () => {
    const choice = document.querySelector(`input[name="giftTheme"][value="${previewTheme}"]`);
    if (choice) {choice.checked = true;choice.dispatchEvent(new Event("change", {bubbles:true}));}
    giftPreviewDialog.close();
  });
  giftPreviewDialog.addEventListener("click", event => {if (event.target === giftPreviewDialog) giftPreviewDialog.close();});
  document.querySelectorAll('[data-preview-theme]').forEach(button => button.addEventListener("click", () => selectPreviewTheme(button.dataset.previewTheme)));
  document.querySelectorAll('[data-gift-preview]').forEach(button => button.addEventListener("click", event => {
    event.preventDefault();event.stopPropagation();openGiftPreview(button.dataset.giftPreview);
  }));
  document.getElementById("giftPreviewSelected").addEventListener("click", () => openGiftPreview(giftTheme()));
  gift.message.addEventListener("input", () => {
    if (currentMessageMode === "suggested") messageEdited = gift.message.value !== lastSuggested;
    saveGiftDraft(); resetIdempotency();
  });
  [gift.sender,gift.senderPhone,gift.recipient,gift.recipientPhone,gift.consent].forEach(el=>{
    el.addEventListener("input",()=>{syncGift();saveGiftDraft();resetIdempotency();});
    el.addEventListener("change",()=>{syncGift();saveGiftDraft();resetIdempotency();});
  });
  gift.enabled.addEventListener("change",()=>{syncGift();saveGiftDraft();resetIdempotency();});
  gift.senderPhone.addEventListener("input",()=>{elements.phone.value=gift.senderPhone.value;});
  document.querySelectorAll('input[name="giftScheduleMode"],input[name="giftTheme"]').forEach(el=>el.addEventListener("change",()=>{syncGift();saveGiftDraft();resetIdempotency();}));
  document.querySelectorAll('input[name="giftMessageMode"]').forEach(el=>el.addEventListener("change",()=>{
    if (!el.checked) return;
    if (currentMessageMode === "custom") savedCustomMessage = gift.message.value;
    else savedSuggestedMessage = gift.message.value;
    currentMessageMode = el.value;
    if (el.value === "custom") {
      gift.message.value = savedCustomMessage;
      messageEdited = true;
      gift.message.focus();
    } else {
      const nextSuggested = suggestedGiftMessage();
      if (savedSuggestedMessage === null || savedSuggestedMessage === lastSuggested) {
        gift.message.value = nextSuggested;
        messageEdited = false;
      } else {
        // A hand-edited suggestion keeps its wording but refreshes its signature.
        const oldSignature = lastSuggested.split("\n").at(-1);
        const newSignature = nextSuggested.split("\n").at(-1);
        gift.message.value = oldSignature && savedSuggestedMessage.includes(oldSignature)
          ? savedSuggestedMessage.replace(oldSignature, newSignature) : savedSuggestedMessage;
        messageEdited = gift.message.value !== nextSuggested;
      }
      lastSuggested = nextSuggested;
    }
    syncGift();saveGiftDraft();resetIdempotency();
  }));

  // =============================================
  // NOSHI COUPONS — CUSTOMER CHECKOUT
  // يبقى مغلقًا إلى أن تنجح اختبارات الحجز والرفض
  // =============================================

  const COUPONS_ENABLED = true;

  const COUPON_PREVIEW_URL = ORDER_API_URL.replace(
    /\/api\/orders\/?$/,
    "/api/coupons/preview"
  );

  let appliedCoupon = null;
  let couponRequestVersion = 0;

  elements.couponSection.hidden = !COUPONS_ENABLED;

  function currentCouponItems() {
    return cart.lines().map(line => ({
      productId: line.product.id,
      quantity: line.quantity
    }));
  }

  function couponCartFingerprint() {
    return JSON.stringify(currentCouponItems());
  }

  function clearCoupon(message = "", state = message ? "error" : "neutral") {
    couponRequestVersion++;
    elements.couponApply.disabled = false;
    appliedCoupon = null;
    elements.couponMessage.textContent = message;
    elements.couponMessage.dataset.state = state;
    elements.couponRemove.hidden = true;
    elements.couponDiscountRow.hidden = true;
    elements.couponDiscountAmount.textContent = "− 0 ريال";
    resetIdempotency();
  }

  function renderCouponTotal() {
    const currentFingerprint = couponCartFingerprint();

    if (
      appliedCoupon &&
      appliedCoupon.fingerprint !== currentFingerprint
    ) {
      clearCoupon("تغيرت السلة، يرجى تطبيق الكود مرة أخرى.");
    }

    const couponAmount = Number(appliedCoupon?.discountAmount || 0);
    const subtotal = cart.subtotal();
    const fee = selectedDelivery()?.fee || 0;

    elements.couponDiscountRow.hidden = couponAmount <= 0;
    elements.couponDiscountAmount.textContent =
      `− ${formatMoney(couponAmount)}`;

    elements.grandTotal.textContent =
      formatMoney(Math.max(0, subtotal - couponAmount) + fee);
  }

  async function applyCoupon() {
    if (!COUPONS_ENABLED || submitting) return;

    const code = elements.couponInput.value.trim().toUpperCase();

    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      clearCoupon("اكتب كود خصم صحيح.");
      renderCouponTotal();
      return;
    }

    const fingerprint = couponCartFingerprint();
    const requestVersion = ++couponRequestVersion;

    appliedCoupon = null;
    elements.couponRemove.hidden = true;
    elements.couponDiscountRow.hidden = true;
    elements.couponApply.disabled = true;
    elements.couponMessage.textContent = "جاري التحقق من الكود...";
    elements.couponMessage.dataset.state = "neutral";

    try {
      const response = await fetch(COUPON_PREVIEW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          items: currentCouponItems()
        })
      });

      const data = await response.json();

      if (
        requestVersion !== couponRequestVersion ||
        fingerprint !== couponCartFingerprint()
      ) {
        return;
      }

      if (!response.ok || !data.success) {
        clearCoupon(data.message || "تعذّر تطبيق كود الخصم.");
        renderCouponTotal();
        return;
      }

      appliedCoupon = {
        code: data.code,
        discountAmount: Number(data.discountAmount),
        fingerprint
      };

      elements.couponInput.value = data.code;
      elements.couponRemove.hidden = false;
      elements.couponMessage.textContent =
        data.message || "تم تطبيق كود الخصم بنجاح.";
      elements.couponMessage.dataset.state = "success";

      resetIdempotency();
      renderCouponTotal();

    } catch (error) {
      if (requestVersion === couponRequestVersion) {
        clearCoupon("تعذّر التحقق من الكود، حاول مرة أخرى.");
        renderCouponTotal();
      }
    } finally {
      if (requestVersion === couponRequestVersion) {
        elements.couponApply.disabled = false;
      }
    }
  }

  elements.couponApply.addEventListener("click", applyCoupon);

  elements.couponRemove.addEventListener("click", () => {
    elements.couponInput.value = "";
    clearCoupon("تمت إزالة كود الخصم.", "neutral");
    renderCouponTotal();
  });

  elements.couponInput.addEventListener("input", () => {
    clearCoupon("");
    renderCouponTotal();
  });

  // لو تغيرت المنتجات أو الكميات نلغي المعاينة القديمة.
  window.addEventListener("noshi:cart-change", () => {
    if (appliedCoupon &&
        appliedCoupon.fingerprint !== couponCartFingerprint()) {
      clearCoupon("تغيرت السلة، يرجى تطبيق الكود مرة أخرى.");
    }
    renderCouponTotal();
  });



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
    return `${match[1]}/${match[2]}/${match[3]}`;
  }

  function formatTime12(value) {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
    if (!match) return "";
    const hour24 = Number(match[1]);
    const minutes = match[2];
    const period = hour24 < 12 ? "ص" : "م";
    const hour12 = hour24 % 12 || 12;
    return `⁦${period} ${hour12}:${minutes}⁩`;
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

  function saveGiftDraft() {
    try {
      sessionStorage.setItem(GIFT_DRAFT_KEY, JSON.stringify({
        enabled: gift.enabled.checked,
        sender: gift.sender.value, senderPhone: gift.senderPhone.value,
        recipient: gift.recipient.value, recipientPhone: gift.recipientPhone.value,
        message: gift.message.value, messageMode: currentMessageMode,
        edited: messageEdited, suggested: savedSuggestedMessage,
        custom: savedCustomMessage, lastSuggested,
        theme: giftTheme(), scheduleMode: giftMode(), consent: gift.consent.checked
      }));
    } catch (_) { /* Storage unavailable: the live form remains usable. */ }
  }

  function restoreGiftDraft() {
    let state;
    try { state = JSON.parse(sessionStorage.getItem(GIFT_DRAFT_KEY) || "null"); }
    catch (_) { return; }
    if (!state || typeof state !== "object") return;
    gift.enabled.checked = state.enabled === true;
    for (const [key, el] of [["sender",gift.sender],["senderPhone",gift.senderPhone],["recipient",gift.recipient],["recipientPhone",gift.recipientPhone]]) {
      if (typeof state[key] === "string") el.value = state[key].slice(0, key.toLowerCase().includes("phone") ? 16 : 80);
    }
    if (["rose","luxury","joy"].includes(state.theme)) {
      const input = document.querySelector(`input[name="giftTheme"][value="${state.theme}"]`);
      if (input) input.checked = true;
    }
    if (["sender","recipient"].includes(state.scheduleMode)) {
      const input = document.querySelector(`input[name="giftScheduleMode"][value="${state.scheduleMode}"]`);
      if (input) input.checked = true;
    }
    currentMessageMode = state.messageMode === "custom" ? "custom" : "suggested";
    const selected = document.querySelector(`input[name="giftMessageMode"][value="${currentMessageMode}"]`);
    if (selected) selected.checked = true;
    savedSuggestedMessage = typeof state.suggested === "string" ? state.suggested : null;
    savedCustomMessage = typeof state.custom === "string" ? state.custom.slice(0,600) : "";
    lastSuggested = typeof state.lastSuggested === "string" ? state.lastSuggested.slice(0,600) : suggestedGiftMessage();
    gift.message.value = typeof state.message === "string" ? state.message.slice(0,600) : (currentMessageMode === "custom" ? savedCustomMessage : lastSuggested);
    messageEdited = currentMessageMode === "suggested" && gift.message.value !== lastSuggested;
    gift.consent.checked = state.consent === true;
    updateSuggestedMessage();
  }

  function clearCheckout() {
    removeStorage(CHECKOUT_KEY);
    try { sessionStorage.removeItem(GIFT_DRAFT_KEY); } catch (_) { /* no-op */ }
    document.querySelectorAll('input[name="delivery"]').forEach((input) => {
      input.checked = false;
    });
    elements.phone.value = "";
    gift.enabled.checked = false;
    [gift.sender,gift.senderPhone,gift.recipient,gift.recipientPhone].forEach(el=>el.value="");
    messageEdited = false;
    savedSuggestedMessage = null;
    savedCustomMessage = "";
    currentMessageMode = "suggested";
    gift.message.value = suggestedGiftMessage();
    gift.consent.checked = false;
    document.querySelectorAll('input[name="giftScheduleMode"]').forEach(el=>el.checked=false);
    document.querySelectorAll('input[name="giftTheme"]').forEach(el=>el.checked=false);
    document.querySelector('input[name="giftMessageMode"][value="suggested"]').checked=true;
    syncGift();
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
    const { product, variant, quantity, lineTotal } = line;
    const size = variant ? ` · ${variant.name}` : (product.showSize && product.size ? ` · ${englishDigits(product.size)}` : "");
    return `
      <article class="cart-item" data-product-id="${product.id}" data-cart-key="${line.key}">
        <img class="item-image" src="${product.image}" width="64" height="64" alt="صورة ${product.name}" />
        <div class="item-content">
          <div class="item-top">
            <div style="min-width:0">
              <div class="item-name">${product.name}</div>
              <div class="item-meta">${priceMeta(line)}${size}</div>
            </div>
            <button class="remove-button" type="button" data-action="remove" data-id="${product.id}" data-variant-id="${line.variantId || ""}">حذف</button>
          </div>
          <div class="item-bottom">
            <div class="quantity" aria-label="كمية ${product.name}">
              <button type="button" data-action="decrease" data-id="${product.id}" data-variant-id="${line.variantId || ""}" ${quantity <= 1 ? "disabled" : ""} aria-label="تقليل الكمية">−</button>
              <output>${formatNumber(quantity)}</output>
              <button type="button" data-action="increase" data-id="${product.id}" data-variant-id="${line.variantId || ""}" aria-label="زيادة الكمية">+</button>
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
    renderCouponTotal();    elements.submit.disabled = lines.length === 0;
    updateNavigation();
  }

  function updatePickerText() {
    const dateValue = formatDate(elements.dateInput.value);
    elements.dateText.textContent = dateValue || "اختاري التاريخ";
    elements.dateText.dir = dateValue ? "ltr" : "rtl";
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

    if (!phone && !gift.enabled.checked) {
      setError(elements.phoneError, elements.phone, "اكتبي رقم جوال سعودي صحيح، مثل 05XXXXXXXX.");
      invalid.push(elements.phoneSection);
    } else clearError(elements.phoneError, elements.phone);

    if (!delivery) {
      setError(elements.deliveryError, elements.deliveryGroup, "اختاري نطاق التوصيل.");
      invalid.push(elements.deliverySection);
    } else clearError(elements.deliveryError, elements.deliveryGroup);

    if (gift.enabled.checked && giftMode() === "recipient") {
      clearError(elements.dateError, elements.dateControl);
    } else if (!elements.dateInput.value) {
      setError(elements.dateError, elements.dateControl, "اختاري تاريخ التوصيل.");
      invalid.push(elements.dateField);
    } else if (elements.dateInput.value < localToday()) {
      setError(elements.dateError, elements.dateControl, "التاريخ يجب أن يكون اليوم أو بعده.");
      invalid.push(elements.dateField);
    } else clearError(elements.dateError, elements.dateControl);

    if (gift.enabled.checked && giftMode() === "recipient") {
      clearError(elements.timeError, elements.timeControl);
    } else if (!allowedTimes.has(elements.timeInput.value)) {
      setError(elements.timeError, elements.timeControl, "اختاري وقت التوصيل.");
      invalid.push(elements.timeField);
    } else if (!isDeliveryTimeAvailable(elements.timeInput.value)) {
      setError(elements.timeError, elements.timeControl, "هذا الوقت انتهى، اختاري وقتًا لاحقًا.");
      invalid.push(elements.timeField);
    } else {
      clearError(elements.timeError, elements.timeControl);
    }

    if (gift.enabled.checked) {
      const names=gift.sender.value.trim() && gift.recipient.value.trim() && gift.sender.value.trim().length<=80 && gift.recipient.value.trim().length<=80;
      const phones=normalizePhone(gift.senderPhone.value) && normalizePhone(gift.recipientPhone.value);
      const message=gift.message.value.trim();
      const ok=names && phones && message && message.length<=600 && giftTheme() && giftMode() && gift.consent.checked;
      gift.error.textContent=ok?"":"أكملي أسماء وجوالات المُهدية والمستلمة ورسالة الهدية والقالب وطريقة الموعد والموافقة على التواصل.";
      if(!ok) invalid.push(document.getElementById("giftSection"));
    }
    return { valid: invalid.length === 0, first: invalid[0] || null, delivery, phone: gift.enabled.checked?normalizePhone(gift.senderPhone.value):phone };
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
      deliveryDate: gift.enabled.checked && giftMode()==="recipient" ? "" : elements.dateInput.value,
      deliveryTime: gift.enabled.checked && giftMode()==="recipient" ? "" : elements.timeInput.value,
      notes: elements.notes.value.trim(),
      items: cart.lines().map((line) => ({
        productId: line.product.id,
        variant: line.variantId || undefined,
        quantity: line.quantity,
      })),
    };
        if (COUPONS_ENABLED && appliedCoupon) {
      payload.couponCode = appliedCoupon.code;
    }
    if(gift.enabled.checked) payload.gift = {
      senderName:gift.sender.value.trim(), senderPhone:normalizePhone(gift.senderPhone.value),
      recipientName:gift.recipient.value.trim(), recipientPhone:normalizePhone(gift.recipientPhone.value),
      message:gift.message.value.trim(), theme:giftTheme(), scheduleMode:giftMode(), contactConsent:gift.consent.checked
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
    const variantId = button.dataset.variantId || "";
    const key = variantId ? `${id}::${variantId}` : id;
    const current = cart.read()[key] || 0;
    if (button.dataset.action === "increase") cart.setQuantity(id, current + 1, variantId);
    if (button.dataset.action === "decrease" && current > 1) cart.setQuantity(id, current - 1, variantId);
    if (button.dataset.action === "remove") {
      const product = products.find((item) => item.id === id);
      cart.remove(id, variantId);
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
            if (COUPONS_ENABLED &&
          appliedCoupon &&
          appliedCoupon.fingerprint !== couponCartFingerprint()) {
        clearCoupon("تغيرت السلة، يرجى إعادة تطبيق الكود.");
        renderCouponTotal();
        throw new Error("COUPON_CART_CHANGED");
      }
      const data = await createOrder(result);
      const orderNumber = String(data.orderNumber);
      const message = buildMessage(orderNumber);
      lastWhatsAppUrl = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;

      elements.successOrderNumber.textContent = `#${orderNumber}`;
      const completedGift = gift.enabled.checked;
      cart.clear();
      clearCheckout();
      resetIdempotency();
      render();
      resetSuccessDialog();
      openDialog(elements.successDialog);
      // Keep the original success ticket, countdown, WhatsApp button and handoff.
      // Gift orders only get an additional explanatory line; they must not hide it.
      document.getElementById("checkoutSuccessMessage").textContent = completedGift
        ? "وصل طلب هديتك لنوشي 🎁 فريقنا سيتواصل مع المستلمة لإرسال رابط الهدية والتأكد من موعد التوصيل. أرسلي رقم الطلب لنا على واتساب للمتابعة."
        : "تكرّمًا، أرسل رقم الطلب لنا على الواتساب علشان نتابع طلبك بسهولة.";
      document.getElementById("checkoutWhatsappHandoff").hidden = false;
      elements.successWhatsApp.hidden = false;
      startWhatsAppCountdown(30);
    } catch (error) {
      console.error("Noshi order error", error);
      if (error?.message === "ORDER_API_NOT_CONFIGURED") {
        elements.formMessage.textContent = "نسخة الطلبات التجريبية تحتاج وضع رابط Cloudflare Worker أولًا.";
      } else {
elements.formMessage.textContent =
  error?.message === "COUPON_CART_CHANGED"
    ? "تغيرت السلة، يرجى تطبيق كود الخصم مرة أخرى."
    : "تعذر اعتماد الطلب الآن. لم يتم تفريغ السلة؛ حاولي مرة أخرى.";      }
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
  restoreGiftDraft();

  // يتحقق من التاريخ المحفوظ، ثم يعيد بناء الأوقات حسب التاريخ:
  // اليوم = إغلاق الأوقات المنتهية، يوم قادم = جميع الأوقات متاحة.
  enforceDeliveryDate();
  populateTimeOptions();

  syncGift();
  render();
})();
