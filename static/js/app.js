window.CrumbCo = window.CrumbCo || {};

CrumbCo.initNavigation = () => {
  const menuButton = CrumbCo.$("#mobile-menu");
  const sidebar = document.querySelector(".sidebar");
  const mobileViewport = window.matchMedia("(max-width: 700px)");
  const setSidebarOpen = (open) => {
    sidebar.classList.toggle("open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute(
      "aria-label",
      open ? "Close navigation menu" : "Open navigation menu",
    );
    sidebar.inert = mobileViewport.matches && !open;
    if (open && mobileViewport.matches) {
      sidebar.querySelector("[data-section]")?.focus();
    }
  };
  CrumbCo.closeMobileNavigation = () => setSidebarOpen(false);
  setSidebarOpen(false);
  mobileViewport.addEventListener("change", () => setSidebarOpen(false));
  document.querySelectorAll("[data-section]").forEach((item) => {
    item.addEventListener("click", () =>
      CrumbCo.openSection(item.dataset.section),
    );
  });
  document.querySelectorAll("[data-section-link]").forEach((item) => {
    item.addEventListener("click", () =>
      CrumbCo.openSection(item.dataset.sectionLink),
    );
  });
  menuButton.addEventListener("click", () => {
    setSidebarOpen(menuButton.getAttribute("aria-expanded") !== "true");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
      setSidebarOpen(false);
      menuButton.focus();
    }
  });
  const topbarSearch = CrumbCo.$("#topbar-product-search");
  topbarSearch.addEventListener("input", (event) => {
    CrumbCo.openSection("products");
    const productSearch = CrumbCo.$("#product-search");
    productSearch.value = event.target.value;
    productSearch.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

CrumbCo.initActions = () => {
  CrumbCo.$("#close-order-modal").addEventListener(
    "click",
    CrumbCo.closeOrderModal,
  );
  CrumbCo.$("#cancel-order").addEventListener("click", CrumbCo.closeOrderModal);
  CrumbCo.$("#order-paid").addEventListener("input", () => {
    const totalText = CrumbCo.$("#order-total").textContent.replace(
      /[^\d.]/g,
      "",
    );
    CrumbCo.updatePayment(Number(totalText || 0));
  });
  CrumbCo.$("#order-modal").addEventListener("click", (event) => {
    if (event.target.id === "order-modal") CrumbCo.closeOrderModal();
  });
  document.addEventListener("keydown", (event) => {
    const dialog = [...document.querySelectorAll(
      '[role="dialog"][aria-modal="true"]:not(.hidden)',
    )].find((item) => item.id !== "system-modal");
    if (!dialog) return;
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.querySelector(
        ".modal-close, #cancel-order, #cancel-inventory",
      )?.click();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...dialog.querySelectorAll(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
    )].filter((element) => element.getClientRects().length > 0);
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
};

CrumbCo.initCustomers = () => {
  const table = CrumbCo.$("#customers-table");
  const count = CrumbCo.$("#customer-count");
  const render = () => {
    table.innerHTML = CrumbCo.customers
      .map(
        (customer) =>
          `<tr><td><strong>${customer.name}</strong></td><td>${customer.contact}</td><td>${customer.orders}</td><td>${customer.value}</td><td>${customer.lastOrder}</td></tr>`,
      )
      .join("");
    count.textContent = CrumbCo.customers.length.toLocaleString();
  };
  CrumbCo.$("#add-customer-btn").addEventListener("click", async () => {
    const customer = await CrumbCo.openModal({
      title: "Add customer",
      message: "Enter the customer's details.",
      fields: [{name: "name", label: "Customer name"}, {name: "contact", label: "Email or phone"}],
      confirmText: "Add customer"
    });
    if (!customer || !customer.name.trim() || !customer.contact.trim()) return;
    CrumbCo.api("/customers", {
      method: "POST",
      body: JSON.stringify({ name: customer.name.trim(), contact: customer.contact.trim() }),
    })
      .then((customer) => {
        CrumbCo.customers.unshift({
          ...customer,
          value: "₱0",
          lastOrder: "No orders yet",
        });
        render();
        CrumbCo.showToast(`${customer.name.trim()} added to customers.`);
      })
      .catch((error) => CrumbCo.showToast(error.message));
  });
  render();
};

CrumbCo.init = async () => {
  try {
    await CrumbCo.loadDatabaseState();
  } catch (error) {
    console.error(error);
    CrumbCo.showToast(error.message);
    return;
  }
  CrumbCo.initAuth();
  CrumbCo.initNavigation();
  CrumbCo.initActions();
  CrumbCo.initOrders();
  CrumbCo.initProducts();
  CrumbCo.initInventory();
  CrumbCo.initCustomers();
  CrumbCo.initAdmin();
  Promise.all([CrumbCo.initDashboard(), CrumbCo.initReports()]).catch(
    (error) => {
      console.error(error);
      CrumbCo.showToast(`Unable to load dashboard data: ${error.message}`);
    },
  );
};

document.addEventListener("DOMContentLoaded", CrumbCo.init);
