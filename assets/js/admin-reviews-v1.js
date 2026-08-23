(() => {
  "use strict";

  const API = "https://noshi-reviews-api.mremadcraftplugins.workers.dev";
  const TOKEN_KEY = "noshiReviewsAdminToken";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  let currentStatus = "pending";

  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[char]
    );

  const getToken = () => localStorage.getItem(TOKEN_KEY) || "";

  const showLogin = (message = "") => {
    $("#adminDashboard").hidden = true;
    $("#adminLoginView").hidden = false;

    const error = $("#adminLoginError");
    if (message) {
      error.textContent = message;
      error.hidden = false;
    } else {
      error.textContent = "";
      error.hidden = true;
    }

    $("#adminLoginToken").value = "";
    setTimeout(() => $("#adminLoginToken").focus(), 40);
  };

  const showDashboard = () => {
    $("#adminLoginView").hidden = true;
    $("#adminDashboard").hidden = false;
  };

  const authHeaders = (extra = {}) => ({
    Authorization: `Bearer ${getToken()}`,
    ...extra,
  });

  async function verifyToken(token) {
    const response = await fetch(
      `${API}/api/admin/reviews?status=pending`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401) {
      return false;
    }

    if (!response.ok) {
      throw new Error("تعذر الاتصال بلوحة الإدارة الآن.");
    }

    return true;
  }

  async function loadReviews() {
    const token = getToken();

    if (!token) {
      showLogin();
      return;
    }

    const list = $("#adminList");
    list.innerHTML = '<div class="admin-empty">جاري التحميل…</div>';

    try {
      const response = await fetch(
        `${API}/api/admin/reviews?status=${encodeURIComponent(currentStatus)}`,
        {
          headers: authHeaders(),
        }
      );

      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        showLogin("انتهت جلسة الدخول أو رمز الإدارة غير صحيح.");
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحميل التقييمات.");
      }

      const items = Array.isArray(data.reviews) ? data.reviews : [];

      if (!items.length) {
        list.innerHTML = '<div class="admin-empty">لا توجد تقييمات هنا.</div>';
        return;
      }

      list.innerHTML = items
        .map((review) => {
          const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));

          return `
            <article class="admin-card" data-id="${esc(review.id)}">
              <div class="admin-card-top">
                <div class="admin-customer">
                  <h3>${esc(review.full_name)}</h3>
                  <div class="admin-meta">
                    <span>يظهر: ${esc(review.display_name)}</span>
                    <span>الجوال: ${esc(review.phone)}</span>
                    <span>${esc(review.created_at)}</span>
                  </div>
                </div>
                <div class="admin-rating" aria-label="التقييم ${rating} من 5">
                  ${"★".repeat(rating)}${"☆".repeat(5 - rating)}
                </div>
              </div>

              <div class="admin-comment">${esc(review.comment)}</div>

              ${
                currentStatus === "pending"
                  ? `
                    <div class="admin-actions">
                      <button type="button" class="approve" data-act="approved">
                        اعتماد ونشر
                      </button>
                      <button type="button" class="reject" data-act="rejected">
                        رفض
                      </button>
                    </div>
                  `
                  : ""
              }
            </article>
          `;
        })
        .join("");
    } catch (error) {
      list.innerHTML = `<div class="admin-empty">${esc(error.message || "حدث خطأ.")}</div>`;
    }
  }

  async function updateReview(id, nextStatus, button) {
    if (!id || !["approved", "rejected"].includes(nextStatus)) return;

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "جاري الحفظ…";

    try {
      const response = await fetch(`${API}/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: authHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        showLogin("انتهت جلسة الدخول. سجل الدخول مرة أخرى.");
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحديث التقييم.");
      }

      await loadReviews();
    } catch (error) {
      alert(error.message || "تعذر تحديث التقييم.");
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  $("#adminLoginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const input = $("#adminLoginToken");
    const button = $("#adminLoginButton");
    const error = $("#adminLoginError");
    const token = input.value.trim();

    error.hidden = true;
    error.textContent = "";

    if (!token) {
      error.textContent = "أدخل Admin Token.";
      error.hidden = false;
      return;
    }

    button.disabled = true;
    button.textContent = "جاري التحقق…";

    try {
      const valid = await verifyToken(token);

      if (!valid) {
        throw new Error("رمز الإدارة غير صحيح.");
      }

      localStorage.setItem(TOKEN_KEY, token);
      showDashboard();
      await loadReviews();
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      error.textContent = err.message || "تعذر تسجيل الدخول.";
      error.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = "تسجيل الدخول";
    }
  });

  $("#adminLogout").addEventListener("click", () => {
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
  });

  $("#adminRefresh").addEventListener("click", loadReviews);

  $$(".admin-tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".admin-tabs button").forEach((item) =>
        item.classList.remove("active")
      );

      button.classList.add("active");
      currentStatus = button.dataset.status;
      loadReviews();
    });
  });

  $("#adminList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-act]");
    if (!button) return;

    const card = button.closest(".admin-card");
    if (!card) return;

    updateReview(card.dataset.id, button.dataset.act, button);
  });

  (async () => {
    const token = getToken();

    if (!token) {
      showLogin();
      return;
    }

    try {
      const valid = await verifyToken(token);

      if (!valid) {
        localStorage.removeItem(TOKEN_KEY);
        showLogin("انتهت جلسة الدخول. سجل الدخول مرة أخرى.");
        return;
      }

      showDashboard();
      await loadReviews();
    } catch {
      showLogin("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    }
  })();
})();
