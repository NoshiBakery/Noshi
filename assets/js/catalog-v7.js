"use strict";

(function initCatalog() {
  const products = window.NOSHI_PRODUCTS || [];
  const cart = window.NoshiCart;
  const offers = window.NoshiOffers;
  if (!cart) return;

  cart.importFromUrl();

  const grid = document.getElementById("productsGrid");
  const showMoreButton = document.getElementById("showMoreBtn");
  const showMoreWrapper = document.getElementById("showMoreWrapper");
  const cartLink = document.querySelector(".floating-cart");
  const modal = document.getElementById("productModal");
  const modalImage = document.getElementById("modalImage");
  const modalTitle = document.getElementById("modalTitle");
  const modalDescription = document.getElementById("modalDescription");
  const modalPrice = document.getElementById("modalPrice");
  const modalSizeWrap = document.getElementById("modalSizeWrap");
  const modalSize = document.getElementById("modalSize");
  const modalClose = document.getElementById("modalClose");
  const modalAddButton = document.getElementById("modalAddToCart");
  const toast = document.getElementById("toastMessage");

  let expanded = false;
  let activeProductId = null;
  let lastTrigger = null;
  let toastTimer = null;

  function englishDigits(value) {
    return String(value ?? "")
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
  }

  function number(value) {
    return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  function money(value) {
    return `${number(value)} ريال`;
  }

  function pricingFor(product) {
    return offers?.pricingFor(product) || {
      originalPrice: Number(product?.price || 0),
      finalPrice: Number(product?.price || 0),
      percent: 0,
      hasOffer: false,
    };
  }

  function priceMarkup(product) {
    const pricing = pricingFor(product);
    if (!pricing.hasOffer) return `<span class="current-product-price">${money(pricing.finalPrice)}</span>`;
    return `<span class="current-product-price sale">${money(pricing.finalPrice)}</span><span class="original-product-price">${money(pricing.originalPrice)}</span><span class="catalog-offer-chip">خصم ${number(pricing.percent)}%</span>`;
  }

  function imageSrcset(path) {
    return `${path.replace(/\.webp$/i, "-480.webp")} 480w, ${path} 960w`;
  }

  function productById(id) {
    return products.find((product) => product.id === id) || null;
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 1700);
  }

  function updateCartUI() {
    const count = cart.count();
    document.querySelectorAll("[data-cart-count]").forEach((badge) => {
      badge.textContent = number(count);
      badge.hidden = count === 0;
    });
    if (cartLink) cartLink.href = cart.cartUrl(cart.pageSource());

    // Keep the current catalog URL carrying the latest snapshot too.
    // This prevents losing the cart when the files are previewed directly without a web server.
    try {
      const filename = window.location.pathname.split("/").pop() || "index.html";
      const hash = window.location.hash || "";
      history.replaceState(null, "", `${filename}?cart=${cart.encode(cart.read())}${hash}`);
    } catch (_) {
      // Some embedded browsers may block history changes; storage and the cart link still work.
    }
  }

  function bumpCart() {
    if (!cartLink) return;
    cartLink.classList.remove("cart-bump");
    void cartLink.offsetWidth;
    cartLink.classList.add("cart-bump");
    window.setTimeout(() => cartLink.classList.remove("cart-bump"), 900);
  }

  function animateIntoCart(product, source) {
    if (!cartLink || !source || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      bumpCart();
      return;
    }

    const sourceRect = source.getBoundingClientRect();
    const targetRect = cartLink.getBoundingClientRect();
    if (!sourceRect.width || !targetRect.width) {
      bumpCart();
      return;
    }

    const size = Math.max(58, Math.min(82, sourceRect.width * 0.55));
    const flyer = document.createElement("div");
    flyer.className = "noshi-cart-flyer";
    flyer.setAttribute("aria-hidden", "true");
    flyer.style.width = `${size}px`;
    flyer.style.height = `${size}px`;
    flyer.style.left = `${sourceRect.left + sourceRect.width / 2 - size / 2}px`;
    flyer.style.top = `${sourceRect.top + sourceRect.height / 2 - size / 2}px`;

    const flyerImage = document.createElement("img");
    flyerImage.src = product.image;
    flyerImage.alt = "";
    const quantityBadge = document.createElement("span");
    quantityBadge.textContent = "+1";
    flyer.append(flyerImage, quantityBadge);
    document.body.appendChild(flyer);

    const dx = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
    const dy = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);
    const animation = flyer.animate(
      [
        { transform: "translate3d(0,0,0) scale(.82)", opacity: 0, offset: 0 },
        { transform: "translate3d(0,-14px,0) scale(1.08)", opacity: 1, offset: 0.16 },
        { transform: `translate3d(${dx * 0.38}px, ${dy * 0.24 - 74}px, 0) scale(1)`, opacity: 1, offset: 0.48 },
        { transform: `translate3d(${dx * 0.78}px, ${dy * 0.68 - 34}px, 0) scale(.72)`, opacity: 1, offset: 0.78 },
        { transform: `translate3d(${dx}px, ${dy}px, 0) scale(.18)`, opacity: 0.25, offset: 1 },
      ],
      { duration: 1250, easing: "cubic-bezier(.22,.75,.2,1)", fill: "forwards" },
    );

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      flyer.remove();
      bumpCart();
    };
    animation.addEventListener("finish", finish, { once: true });
    animation.addEventListener("cancel", finish, { once: true });
    window.setTimeout(finish, 1450);
  }

  function addProduct(productId, source, button) {
    const product = productById(productId);
    if (!product) return;
    animateIntoCart(product, source);
    cart.add(product.id, 1);
    updateCartUI();
    showToast(`تمت إضافة ${product.name} للسلة`);

    const label = button?.querySelector("span:last-child") || button;
    const original = label?.textContent;
    button?.classList.add("added");
    if (label) label.textContent = "تمت الإضافة ✓";
    window.setTimeout(() => {
      button?.classList.remove("added");
      if (label && original) label.textContent = original;
    }, 1050);
  }

  function openProduct(productId, trigger) {
    const product = productById(productId);
    if (!product || !modal) return;
    activeProductId = product.id;
    lastTrigger = trigger;
    modalImage.src = product.image;
    modalImage.srcset = imageSrcset(product.image);
    modalImage.alt = `صورة ${product.name}`;
    modalTitle.textContent = product.name;
    modalDescription.textContent = product.description || "";
    const pricing = pricingFor(product);
    modalPrice.innerHTML = priceMarkup(product);
    const modalBadge = document.getElementById("modalBadge");
    if (modalBadge) modalBadge.textContent = pricing.hasOffer ? `خصم ${number(pricing.percent)}%` : "منتج مميز";
    const hasSize = Boolean(product.showSize && product.size);
    modalSizeWrap.hidden = !hasSize;
    modalSize.textContent = hasSize ? englishDigits(product.size) : "";
    document.body.classList.add("modal-open");
    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
  }

  function closeProduct() {
    if (!modal) return;
    if (typeof modal.close === "function" && modal.open) modal.close();
    else modal.removeAttribute("open");
    document.body.classList.remove("modal-open");
    lastTrigger?.focus?.();
  }

  function renderProducts() {
    if (!grid) return;
    const visible = expanded ? products : products.slice(0, 6);
    grid.replaceChildren();

    visible.forEach((product, index) => {
      const card = document.createElement("article");
      card.className = "product-card";

      const details = document.createElement("button");
      details.type = "button";
      details.className = "product-details-trigger";
      details.setAttribute("aria-label", `عرض تفاصيل ${product.name}`);

      const media = document.createElement("span");
      media.className = "product-media";
      const image = document.createElement("img");
      image.src = product.image;
      image.srcset = imageSrcset(product.image);
      image.sizes = "(max-width: 520px) calc((100vw - 48px) / 2), (max-width: 900px) 210px, 280px";
      image.width = 480;
      image.height = 480;
      image.alt = `صورة ${product.name}`;
      image.loading = index < 6 ? "eager" : "lazy";
      image.decoding = "async";
      media.appendChild(image);

      const pricing = pricingFor(product);
      if (pricing.hasOffer) {
        const offerBadge = document.createElement("span");
        offerBadge.className = "product-badge product-offer-badge";
        offerBadge.textContent = `خصم ${number(pricing.percent)}%`;
        media.appendChild(offerBadge);
      } else if (index < 6) {
        const badge = document.createElement("span");
        badge.className = "product-badge";
        badge.textContent = "من الأكثر طلبًا";
        media.appendChild(badge);
      }

      const body = document.createElement("span");
      body.className = "product-body";
      const title = document.createElement("span");
      title.className = "product-title";
      title.textContent = product.name;
      const description = document.createElement("span");
      description.className = "product-description";
      description.textContent = product.description || "";
      const meta = document.createElement("span");
      meta.className = "product-meta";
      const price = document.createElement("span");
      price.className = "product-price product-price-stack";
      price.innerHTML = priceMarkup(product);
      meta.appendChild(price);
      if (product.showSize && product.size) {
        const size = document.createElement("span");
        size.className = "product-size";
        size.textContent = englishDigits(product.size);
        meta.appendChild(size);
      }
      const action = document.createElement("span");
      action.className = "product-action";
      action.textContent = "عرض التفاصيل";
      body.append(title, description, meta, action);
      details.append(media, body);
      details.addEventListener("click", () => openProduct(product.id, details));

      const add = document.createElement("button");
      add.type = "button";
      add.className = "product-add-btn";
      add.textContent = "إضافة للسلة";
      add.addEventListener("click", () => addProduct(product.id, image, add));

      card.append(details, add);
      grid.appendChild(card);
    });

    if (showMoreWrapper) showMoreWrapper.hidden = expanded || products.length <= 6;
  }

  showMoreButton?.addEventListener("click", () => {
    expanded = true;
    renderProducts();
  });
  modalClose?.addEventListener("click", closeProduct);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeProduct();
  });
  modal?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeProduct();
  });
  modalAddButton?.addEventListener("click", () => {
    if (activeProductId) addProduct(activeProductId, modalImage, modalAddButton);
  });
  window.addEventListener("noshi:cart-change", updateCartUI);
  window.addEventListener("storage", updateCartUI);

  renderProducts();
  updateCartUI();

  // Site interactions kept independent from shopping logic.
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.getElementById("navLinks");
  menuToggle?.addEventListener("click", () => {
    menuToggle.classList.toggle("active");
    navLinks?.classList.toggle("open");
  });
  navLinks?.querySelectorAll("a, button").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle?.classList.remove("active");
      navLinks?.classList.remove("open");
    });
  });

  document.querySelectorAll(".faq-item").forEach((item) => {
    item.querySelector(".faq-question")?.addEventListener("click", () => {
      const wasOpen = item.classList.contains("active");
      document.querySelectorAll(".faq-item").forEach((faq) => faq.classList.remove("active"));
      if (!wasOpen) item.classList.add("active");
    });
  });

  const scrollTopButton = document.getElementById("scrollTopBtn");
  window.addEventListener("scroll", () => scrollTopButton?.classList.toggle("visible", window.scrollY > 300), { passive: true });
  scrollTopButton?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible"));
    }, { threshold: 0.08 });
    document.querySelectorAll(".fade-in-section").forEach((section) => observer.observe(section));
  } else {
    document.querySelectorAll(".fade-in-section").forEach((section) => section.classList.add("is-visible"));
  }

  const cards = Array.from(document.querySelectorAll(".review-card"));
  const dots = Array.from(document.querySelectorAll(".review-dot"));
  let activeReview = 0;
  let timer = null;
  function showReview(index) {
    if (!cards.length) return;
    activeReview = (index + cards.length) % cards.length;
    cards.forEach((card, cardIndex) => {
      const active = cardIndex === activeReview;
      card.classList.toggle("active", active);
      card.setAttribute("aria-hidden", String(!active));
    });
    dots.forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === activeReview));
  }
  function autoplay() {
    if (!cards.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    window.clearInterval(timer);
    timer = window.setInterval(() => showReview(activeReview + 1), 4200);
  }
  document.getElementById("reviewPrev")?.addEventListener("click", () => { showReview(activeReview - 1); autoplay(); });
  document.getElementById("reviewNext")?.addEventListener("click", () => { showReview(activeReview + 1); autoplay(); });
  dots.forEach((dot, index) => dot.addEventListener("click", () => { showReview(index); autoplay(); }));
  showReview(0);
  autoplay();

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
