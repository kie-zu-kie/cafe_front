window.CrumbCo = window.CrumbCo || {};

CrumbCo.initNavigation = () => {
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
  CrumbCo.$("#mobile-menu").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("open");
  });
  CrumbCo.$("#product-search-toggle").addEventListener("click", () => {
    CrumbCo.openSection("products");
    CrumbCo.$("#product-search").focus();
  });
};

CrumbCo.initActions = () => {
  CrumbCo.$("#new-order-btn").addEventListener("click", () => {
    CrumbCo.openSection("orders");
    CrumbCo.openOrderModal();
  });
  CrumbCo.$("#new-order-btn-2").addEventListener(
    "click",
    CrumbCo.openOrderModal,
  );
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
    if (event.key === "Escape") CrumbCo.closeOrderModal();
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
      CrumbCo.showToast("Unable to load dashboard reports.");
    },
  );
};

document.addEventListener("DOMContentLoaded", CrumbCo.init);
