window.CrumbCo = window.CrumbCo || {};

CrumbCo.orders = [];
CrumbCo.products = [];
CrumbCo.customers = [];
CrumbCo.inventory = [];
CrumbCo.productCategories = {
  coffee: { title: "Coffee", emoji: "☕", image: "coffee" },
  pastry: { title: "Pastries", emoji: "🍰", image: "pastry" },
  cookie: { title: "Cookies", emoji: "🍪", image: "cookie" },
  bread: { title: "Bread", emoji: "🍞", image: "bread" },
};

CrumbCo.normalizeProductCategory = (category) => {
  const normalizedCategory = String(category || "")
    .trim()
    .toLowerCase();
  if (normalizedCategory === "cookies") return "cookie";
  if (normalizedCategory === "bread") return "bread";
  if (normalizedCategory === "breads") return "bread";
  if (normalizedCategory === "cookie") return "cookie";
  if (normalizedCategory === "coffee") return "coffee";
  if (normalizedCategory === "pastries") return "pastry";
  if (normalizedCategory === "pastry") return "pastry";
  return "pastry";
};

CrumbCo.productImageFallback = (category) => {
  const imageCategory = CrumbCo.productCategories[category]
    ? category
    : "pastry";
  return `/static/images/products/${imageCategory}.jpg`;
};

CrumbCo.productImageMarkup = (url, category, alt = "") => {
  const fallback = CrumbCo.productImageFallback(category);
  return `<img src="${CrumbCo.escapeHtml(url || fallback)}" data-fallback="${fallback}" alt="${CrumbCo.escapeHtml(alt)}">`;
};

CrumbCo.applyProductImageFallbacks = (root) => {
  root.querySelectorAll("img[data-fallback]").forEach((image) => {
    image.addEventListener("error", () => {
      if (image.dataset.fallbackApplied) {
        image.hidden = true;
        return;
      }
      image.dataset.fallbackApplied = "true";
      image.src = image.dataset.fallback;
    });
  });
};

CrumbCo.apiBase = (
  window.CrumbCoConfig?.apiBaseUrl || "/api"
).replace(/\/+$/, "");

CrumbCo.api = async (path, options = {}) => {
  let response;
  try {
    const {headers = {}, ...requestOptions} = options;
    const requestHeaders = new Headers(headers);
    if (CrumbCo.authenticatedUser?.id) {
      requestHeaders.set("X-User-Id", String(CrumbCo.authenticatedUser.id));
    }
    if (!(requestOptions.body instanceof FormData)) {
      requestHeaders.set("Content-Type", "application/json");
    }
    response = await fetch(`${CrumbCo.apiBase}${path}`, {
      ...requestOptions,
      headers: requestHeaders,
    });
  } catch (error) {
    throw new Error(
      "The backend API is not running. Start it with: python app.py",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `API request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
};

CrumbCo.loadDatabaseState = async () => {
  const [orders, products, customers] = await Promise.all([
    CrumbCo.api("/orders"),
    CrumbCo.api("/products"),
    CrumbCo.api("/customers"),
  ]);

  let inventory = [];
  try {
    inventory = await CrumbCo.api("/ingredients");
  } catch (error) {
    inventory = await CrumbCo.api("/inventory");
  }

  CrumbCo.orders = orders;
  CrumbCo.products = products;
  CrumbCo.customers = customers.map((customer) => ({
    ...customer,
    value: `₱${Number(customer.value || 0).toLocaleString()}`,
    lastOrder: customer.last_order,
  }));
  CrumbCo.inventory = inventory;
};
