"use strict";

(() => {
  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const apiBase = () =>
    String(window.NOSHI_REVIEWS_API_BASE || "")
      .replace(/\/$/, "");

  let activeReview = 0;
  let reviewTimer = null;
  let rating = 0;
  let lastFocusedElement = null;

  // =========================================================
  // عبارات التعليقات
  // اختيار ثابت لكل تعليق اعتمادًا على ID
  // =========================================================

  const reviewSubtitles = [
    "عميلة عسل 🍯",
    "عميلة قشطة 🤍",
    "عميلة سكر 🍰",
    "من حلوات نوشي 🎀",
    "القمر بذات نفسه 🌙",
    "ذوقها نوشي 🤍",
    "ذوق وجمال 🤍"
  ];

  function getReviewSubtitle(review) {
    const key = String(
      review.id ||
      review.display_name ||
      review.comment ||
      ""
    );

    let hash = 0;

    for (let i = 0; i < key.length; i++) {
      hash =
        ((hash << 5) - hash) +
        key.charCodeAt(i);

      hash |= 0;
    }

    return reviewSubtitles[
      Math.abs(hash) % reviewSubtitles.length
    ];
  }

  // =========================================================
  // إخفاء الاسم
  // =========================================================

  function maskName(name) {
    return String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => {
        const chars = Array.from(part);
        const len = chars.length;

        if (len <= 1) {
          return chars[0]
            ? chars[0] + "*"
            : "";
        }

        if (len === 2) {
          return chars[0] + "*";
        }

        if (len === 3) {
          return (
            chars.slice(0, 2).join("") +
            "*"
          );
        }

        if (len === 4) {
          return (
            chars.slice(0, 2).join("") +
            "**"
          );
        }

        return (
          chars.slice(0, 2).join("") +
          "*".repeat(len - 3) +
          chars[len - 1]
        );
      })
      .join(" ");
  }

  // =========================================================
  // سلايدر التعليقات
  // =========================================================

  function initReviewSlider() {
    const track = $("#reviewsTrack");
    const dotsRoot = $("#reviewDots");

    if (!track || !dotsRoot) return;

    const cards = () =>
      $$(".review-card", track);

    const show = (index) => {
      const items = cards();

      if (!items.length) return;

      activeReview =
        (index + items.length) %
        items.length;

      items.forEach((card, i) => {
        const isActive =
          i === activeReview;

        card.classList.toggle(
          "active",
          isActive
        );

        card.setAttribute(
          "aria-hidden",
          String(!isActive)
        );
      });

      $$(".review-dot", dotsRoot)
        .forEach((dot, i) => {
          dot.classList.toggle(
            "active",
            i === activeReview
          );
        });

      const progress =
        $("#reviewProgress");

      if (progress) {
        progress.classList.remove(
          "running"
        );

        void progress.offsetWidth;

        progress.classList.add(
          "running"
        );
      }
    };

    const rebuildDots = () => {
      dotsRoot.innerHTML = "";

      cards().forEach((_, i) => {
        const button =
          document.createElement(
            "button"
          );

        button.type = "button";

        button.className =
          "review-dot" +
          (i === 0
            ? " active"
            : "");

        button.setAttribute(
          "aria-label",
          `الرأي ${i + 1}`
        );

        button.addEventListener(
          "click",
          () => {
            show(i);
            startAutoplay();
          }
        );

        dotsRoot.appendChild(
          button
        );
      });
    };

    function startAutoplay() {
      clearInterval(reviewTimer);

      if (
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
      ) {
        return;
      }

      reviewTimer =
        setInterval(
          () =>
            show(
              activeReview + 1
            ),
          4200
        );
    }

    window.__noshiShowReview =
      show;

    window.__noshiRefreshReviews =
      () => {
        rebuildDots();

        show(
          Math.min(
            activeReview,
            Math.max(
              0,
              cards().length - 1
            )
          )
        );

        startAutoplay();
      };

    rebuildDots();
    show(0);
    startAutoplay();

    $("#reviewPrev")
      ?.addEventListener(
        "click",
        () => {
          show(
            activeReview - 1
          );

          startAutoplay();
        }
      );

    $("#reviewNext")
      ?.addEventListener(
        "click",
        () => {
          show(
            activeReview + 1
          );

          startAutoplay();
        }
      );
  }

  // =========================================================
  // تحميل التعليقات المعتمدة من قاعدة البيانات
  // =========================================================

  async function loadPublicReviews() {
    const base = apiBase();

    if (!base) return;

    try {
      const response =
        await fetch(
          `${base}/api/reviews/public`,
          {
            headers: {
              Accept:
                "application/json"
            }
          }
        );

      if (!response.ok) {
        return;
      }

      const data =
        await response.json();

      const list =
        Array.isArray(
          data.reviews
        )
          ? data.reviews
          : [];

      const track =
        $("#reviewsTrack");

      if (!track) return;

      /*
       * نستخدم أول بطاقة أصلية
       * موجودة في الصفحة كقالب.
       *
       * بهذه الطريقة التعليقات
       * القادمة من D1 تأخذ نفس:
       *
       * - أيقونة البنت
       * - التصميم
       * - الخط
       * - المسافات
       * - علامات الاقتباس
       *
       * الموجودة في التعليقات الأصلية.
       */

      const template =
        $(".review-card", track);

      if (!template) {
        console.warn(
          "Noshi review template not found"
        );

        return;
      }

      list.forEach(
        (review) => {

          // ---------------------------------
          // نسخ البطاقة الأصلية
          // ---------------------------------

          const article =
            template.cloneNode(true);

          article.classList.remove(
            "active"
          );

          article.classList.add(
            "review-card-dynamic"
          );

          article.setAttribute(
            "aria-hidden",
            "true"
          );

          article.dataset.reviewId =
            String(
              review.id || ""
            );

          // ---------------------------------
          // اسم العميلة
          // ---------------------------------

          const name =
            $(
              ".reviewer-info strong",
              article
            );

          if (name) {
            name.textContent =
              review.display_name ||
              "عميلة نوشي";
          }

          // ---------------------------------
          // العبارة الصغيرة تحت الاسم
          // ---------------------------------

          const subtitle =
            $(
              ".reviewer-info span",
              article
            );

          if (subtitle) {
            subtitle.textContent =
              getReviewSubtitle(
                review
              );
          }

          // ---------------------------------
          // نص التعليق
          // ---------------------------------

          const text =
            $(
              ".review-text",
              article
            );

          if (text) {
            text.textContent =
              `“${
                review.comment ||
                ""
              }”`;
          }

          /*
           * النجوم خاصة بإدارة نوشي فقط.
           *
           * العميلة ترسل تقييمها
           * ويتم حفظه في قاعدة البيانات،
           * لكن لا نظهر النجوم للزوار.
           */

          $$(
            [
              ".review-stars",
              ".review-rating",
              "[data-review-rating]"
            ].join(","),
            article
          ).forEach(
            (element) =>
              element.remove()
          );

          // ---------------------------------
          // إضافة البطاقة للسلايدر
          // ---------------------------------

          track.appendChild(
            article
          );
        }
      );

      if (list.length) {
        window
          .__noshiRefreshReviews
          ?.();
      }

    } catch (error) {
      console.warn(
        "Noshi reviews unavailable",
        error
      );
    }
  }

  // =========================================================
  // فتح نافذة التقييم
  // =========================================================

  function openModal() {
    const overlay =
      $("#nrOverlay");

    if (!overlay) return;

    lastFocusedElement =
      document.activeElement;

    overlay.hidden = false;

    overlay.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "nr-modal-open"
    );

    requestAnimationFrame(
      () =>
        overlay.classList.add(
          "nr-open"
        )
    );
  }

  // =========================================================
  // إغلاق نافذة التقييم
  // =========================================================

  function closeModal() {
    const overlay =
      $("#nrOverlay");

    if (!overlay) return;

    overlay.classList.remove(
      "nr-open"
    );

    overlay.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove(
      "nr-modal-open"
    );

    window.setTimeout(
      () => {
        overlay.hidden = true;
      },
      170
    );

    if (
      lastFocusedElement &&
      typeof lastFocusedElement.focus ===
        "function"
    ) {
      lastFocusedElement.focus({
        preventScroll: true
      });
    }
  }

  // =========================================================
  // معاينة الاسم
  // =========================================================

  function updatePreview() {
    const value =
      $("#nrName")
        ?.value
        .trim() || "";

    const mode =
      $(
        'input[name="name_visibility"]:checked'
      )?.value ||
      "masked";

    const preview =
      $("#nrPreview");

    if (preview) {
      preview.textContent =
        value
          ? (
              mode === "full"
                ? value
                : maskName(
                    value
                  )
            )
          : "—";
    }
  }

  // =========================================================
  // تقييم النجوم
  // =========================================================

  function setRating(value) {
    rating =
      Math.max(
        0,
        Math.min(
          5,
          Number(value) || 0
        )
      );

    const hidden =
      $("#nrRating");

    if (hidden) {
      hidden.value =
        String(rating);
    }

    $$(".nr-star")
      .forEach((star) => {
        const selected =
          Number(
            star.dataset.rating
          ) <= rating;

        star.classList.toggle(
          "nr-selected",
          selected
        );

        star.setAttribute(
          "aria-pressed",
          String(selected)
        );
      });
  }

  function ratingFromClientX(
    clientX
  ) {
    const stars =
      $$(".nr-star");

    if (!stars.length) {
      return;
    }

    let closest = 1;
    let bestDistance =
      Infinity;

    stars.forEach(
      (star, i) => {
        const rect =
          star.getBoundingClientRect();

        const center =
          rect.left +
          rect.width / 2;

        const distance =
          Math.abs(
            clientX -
            center
          );

        if (
          distance <
          bestDistance
        ) {
          bestDistance =
            distance;

          closest =
            i + 1;
        }
      }
    );

    setRating(
      closest
    );
  }

  function initStars() {
    const root =
      $("#nrStars");

    if (!root) return;

    $$(".nr-star", root)
      .forEach(
        (star) =>
          star.addEventListener(
            "click",
            () =>
              setRating(
                star.dataset
                  .rating
              )
          )
      );

    let dragging = false;

    root.addEventListener(
      "pointerdown",
      (event) => {
        dragging = true;

        root
          .setPointerCapture
          ?.(
            event.pointerId
          );

        ratingFromClientX(
          event.clientX
        );

        event.preventDefault();
      }
    );

    root.addEventListener(
      "pointermove",
      (event) => {
        if (!dragging) {
          return;
        }

        ratingFromClientX(
          event.clientX
        );

        event.preventDefault();
      }
    );

    const finish =
      (event) => {
        if (!dragging) {
          return;
        }

        ratingFromClientX(
          event.clientX
        );

        dragging = false;

        try {
          root
            .releasePointerCapture
            ?.(
              event.pointerId
            );
        } catch (_) {}
      };

    root.addEventListener(
      "pointerup",
      finish
    );

    root.addEventListener(
      "pointercancel",
      () => {
        dragging = false;
      }
    );
  }

  // =========================================================
  // إعادة تعيين نموذج التقييم
  // =========================================================

  function resetFormState() {
    const form =
      $("#nrForm");

    form?.reset();

    setRating(0);

    const error =
      $("#nrError");

    if (error) {
      error.hidden = true;
      error.textContent = "";
    }

    if (form) {
      form.hidden = false;
    }

    const success =
      $("#nrSuccess");

    if (success) {
      success.hidden = true;
    }

    updatePreview();
  }

  // =========================================================
  // إرسال التقييم
  // =========================================================

  async function submitReview(
    event
  ) {
    event.preventDefault();

    const form =
      event.currentTarget;

    const error =
      $("#nrError");

    const submit =
      $("#nrSubmit");

    if (error) {
      error.hidden = true;
      error.textContent = "";
    }

    // ---------------------------------
    // النجوم مطلوبة من العميلة
    // لكنها خاصة بالإدارة
    // ---------------------------------

    if (!rating) {
      if (error) {
        error.textContent =
          "اختر تقييمك بالنجوم أولًا ✨";

        error.hidden =
          false;
      }

      return;
    }

    if (
      !form.reportValidity()
    ) {
      return;
    }

    const data =
      new FormData(
        form
      );

    const fullName =
      String(
        data.get(
          "full_name"
        ) || ""
      ).trim();

    const visibility =
      String(
        data.get(
          "name_visibility"
        ) ||
        "masked"
      );

    const payload = {
      full_name:
        fullName,

      display_name:
        visibility === "full"
          ? fullName
          : maskName(
              fullName
            ),

      name_visibility:
        visibility,

      phone:
        String(
          data.get(
            "phone"
          ) || ""
        ).trim(),

      /*
       * يتم إرسال النجوم للـ API
       * وحفظها في D1 للإدارة فقط.
       */
      rating,

      comment:
        String(
          data.get(
            "comment"
          ) || ""
        ).trim(),

      page:
        location.pathname
    };

    const base =
      apiBase();

    if (!base) {
      if (error) {
        error.textContent =
          "واجهة التقييم جاهزة، لكن رابط API لم يتم ربطه بعد.";

        error.hidden =
          false;
      }

      return;
    }

    submit.disabled = true;

    submit.textContent =
      "جاري الإرسال…";

    try {
      const response =
        await fetch(
          `${base}/api/reviews`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(
                payload
              )
          }
        );

      const body =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          body.error ||
          "تعذر إرسال التقييم"
        );
      }

      form.hidden = true;

      const success =
        $("#nrSuccess");

      if (success) {
        success.hidden =
          false;
      }

    } catch (err) {
      if (error) {
        error.textContent =
          err.message ||
          "تعذر إرسال التقييم الآن، حاول مرة أخرى.";

        error.hidden =
          false;
      }

    } finally {
      submit.disabled =
        false;

      submit.textContent =
        "إرسال التقييم";
    }
  }

  // =========================================================
  // تشغيل الصفحة
  // =========================================================

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      initReviewSlider();

      loadPublicReviews();

      initStars();

      $$(
        "[data-open-review]"
      ).forEach(
        (button) =>
          button.addEventListener(
            "click",
            () => {
              resetFormState();
              openModal();
            }
          )
      );

      $("#nrClose")
        ?.addEventListener(
          "click",
          closeModal
        );

      $("#nrDone")
        ?.addEventListener(
          "click",
          closeModal
        );

      $("#nrOverlay")
        ?.addEventListener(
          "click",
          (event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }
        );

      document.addEventListener(
        "keydown",
        (event) => {
          if (
            event.key ===
              "Escape" &&
            $("#nrOverlay")
              ?.classList
              .contains(
                "nr-open"
              )
          ) {
            closeModal();
          }
        }
      );

      $("#nrName")
        ?.addEventListener(
          "input",
          updatePreview
        );

      $$(
        "input[name='name_visibility']"
      ).forEach(
        (input) =>
          input.addEventListener(
            "change",
            updatePreview
          )
      );

      $("#nrForm")
        ?.addEventListener(
          "submit",
          submitReview
        );

      updatePreview();
    }
  );
})();
