window.CrumbCo = window.CrumbCo || {};

CrumbCo.renderOrders = (list = CrumbCo.orders) => {
  const canUpdateOrderStatus = ["Admin", "Cashier"].includes(
    CrumbCo.currentUser()?.role,
  );
  const statusControl = (order) =>
    `<select class="status-select ${order.className}" data-order-id="${order.id}" aria-label="${canUpdateOrderStatus ? "Change" : "View"} status for ${order.id}" ${canUpdateOrderStatus ? "" : "disabled"}><option value="Pending" ${order.status === "Pending" ? "selected" : ""}>Pending</option><option value="In progress" ${order.status === "In progress" ? "selected" : ""}>In progress</option><option value="Completed" ${order.status === "Completed" ? "selected" : ""}>Completed</option></select>`;
  const itemDetails = (order) =>
    order.item_details?.length
      ? `<div class="order-product-list">${order.item_details
          .map(
            (item) => {
              const product = CrumbCo.products.find(
                (candidate) => candidate.name === item.name,
              );
              const image = CrumbCo.productImageMarkup(
                item.image_url,
                product?.category,
                item.name,
              );
              return `<span class="order-product">${image}<span>${item.name} × ${item.quantity}</span></span>`;
            },
          )
          .join("")}</div>`
      : order.items;
  const row = (order) =>
    `<tr><td><strong>${order.id}</strong></td><td>${order.customer}</td><td>${itemDetails(order)}</td><td>${order.date}</td><td><strong>${order.total}</strong></td><td>${statusControl(order)}</td></tr>`;
  CrumbCo.$("#orders-table").innerHTML = list.map(row).join("");
  CrumbCo.$("#recent-orders").innerHTML = CrumbCo.orders
    .slice(0, 4)
    .map(
      (order) =>
        `<tr><td><strong>${order.id}</strong></td><td>${order.customer}</td><td>${itemDetails(order)}</td><td><strong>${order.total}</strong></td><td>${statusControl(order)}</td></tr>`,
    )
    .join("");
  CrumbCo.applyProductImageFallbacks(CrumbCo.$("#orders-table"));
  CrumbCo.applyProductImageFallbacks(CrumbCo.$("#recent-orders"));
};

CrumbCo.initOrders = () => {
  let activeFilter = "all";
  const refreshOrderSearch = () => {
    const query = CrumbCo.$("#order-search").value.toLowerCase();
    CrumbCo.renderOrders(
      CrumbCo.orders.filter((order) => {
        const matchesQuery = `${order.id} ${order.customer} ${order.items}`
          .toLowerCase()
          .includes(query);
        const matchesFilter =
          activeFilter === "all" ||
          (activeFilter === "Today" &&
            order.date.toLowerCase().includes("today"));
        return matchesQuery && matchesFilter;
      }),
    );
  };
  CrumbCo.$("#order-search").addEventListener("input", (event) => {
    refreshOrderSearch();
  });
  document.querySelectorAll(".order-filter").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.status;
      document
        .querySelectorAll(".order-filter")
        .forEach((filter) =>
          filter.classList.toggle("active", filter === button),
        );
      refreshOrderSearch();
    });
  });
  ["#orders-table", "#recent-orders"].forEach((selector) => {
    CrumbCo.$(selector).addEventListener("change", (event) => {
      if (!event.target.classList.contains("status-select")) return;
      const order = CrumbCo.orders.find(
        (item) => item.id === event.target.dataset.orderId,
      );
      if (!order) return;
      const newStatus = event.target.value;
      CrumbCo.api(`/orders/${order.id.slice(1)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })
        .then(() => {
          order.status = newStatus;
          order.className =
            newStatus === "Completed"
              ? "completed"
              : newStatus === "In progress"
                ? "progress"
                : "pending";
          refreshOrderSearch();
          CrumbCo.showToast(`${order.id} marked ${newStatus}.`);
        })
        .catch((error) => {
          event.target.value = order.status;
          CrumbCo.showToast(error.message);
        });
    });
  });
  const itemsContainer = CrumbCo.$("#order-items");
  const emptyOrderMessage = CrumbCo.$("#order-empty");
  const productGrid = CrumbCo.$("#order-product-grid");
  const productFilters = CrumbCo.$("#order-product-filters");
  const productSearch = CrumbCo.$("#order-product-search");
  let activeProductCategory = "all";
  const productPrice = (product) => Number(product.price.replace(/[^\d]/g, ""));
  const escapeHtml = (value) => CrumbCo.escapeHtml(value);
  const renderProductFilters = () => {
    const categories = [
      ["all", "All"],
      ...Object.entries(CrumbCo.productCategories).map(([category, config]) => [
        category,
        config.title,
      ]),
    ];
    productFilters.innerHTML = categories
      .map(
        ([category, title]) =>
          `<button class="order-category-button${category === activeProductCategory ? " active" : ""}" type="button" data-category="${category}" aria-pressed="${category === activeProductCategory}">${escapeHtml(title)}</button>`,
      )
      .join("");
  };
  const renderProductCatalog = () => {
    const query = productSearch.value.trim().toLowerCase();
    const products = CrumbCo.products.filter(
      (product) =>
        (activeProductCategory === "all" ||
          product.category === activeProductCategory) &&
        `${product.name} ${product.description || ""}`
          .toLowerCase()
          .includes(query),
    );
    productGrid.innerHTML =
      products
        .map((product) => {
          const category = CrumbCo.productCategories[product.category] ||
            CrumbCo.productCategories.pastry;
          const image = CrumbCo.productImageMarkup(
            product.image_url,
            product.category,
          );
          return `<button class="order-product-card" type="button" data-product-id="${escapeHtml(product.id)}"><span class="order-product-image ${escapeHtml(category.image)}">${image}<span class="order-product-add" aria-hidden="true">+</span></span><span class="order-product-card-name">${escapeHtml(product.name)}</span><span class="order-product-card-footer"><strong>${escapeHtml(product.price)}</strong><span>Add to order</span></span></button>`;
        })
        .join("") ||
      `<p class="order-catalog-empty">${CrumbCo.products.length ? "No products match your search." : "No products are available yet."}</p>`;
    CrumbCo.applyProductImageFallbacks(productGrid);
  };
  const addItemRow = (product) => {
    const row = document.createElement("div");
    row.className = "order-item-row";
    const category = CrumbCo.productCategories[product.category] ||
      CrumbCo.productCategories.pastry;
    const image = CrumbCo.productImageMarkup(
      product.image_url,
      product.category,
    );
    row.innerHTML = `<input class="order-item" type="hidden" value="${escapeHtml(product.name)}" data-price="${productPrice(product)}"><div class="order-cart-item"><span class="order-cart-item-image">${image}</span><span class="order-cart-item-details"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.price)}</small></span></div><div class="order-quantity-controls"><button class="order-quantity-button" type="button" data-quantity-change="-1" aria-label="Remove one ${escapeHtml(product.name)}">−</button><input class="order-quantity" type="number" min="1" max="99" value="1" required aria-label="Quantity of ${escapeHtml(product.name)}"><button class="order-quantity-button" type="button" data-quantity-change="1" aria-label="Add one ${escapeHtml(product.name)}">+</button></div>`;
    itemsContainer.appendChild(row);
    CrumbCo.applyProductImageFallbacks(row);
  };
  CrumbCo.addOrderItem = (productOrName) => {
    const product =
      typeof productOrName === "string"
        ? CrumbCo.products.find((item) => item.name === productOrName)
        : productOrName;
    if (!product) return;
    const existingRow = [
      ...itemsContainer.querySelectorAll(".order-item-row"),
    ].find(
      (row) => row.querySelector(".order-item").value === product.name,
    );
    if (existingRow) {
      const quantityInput = existingRow.querySelector(".order-quantity");
      quantityInput.value = Math.min(99, Number(quantityInput.value) + 1);
    } else {
      addItemRow(product);
    }
    updateTotal();
  };
  const updateTotal = () => {
    const rows = [...itemsContainer.querySelectorAll(".order-item-row")];
    const total = rows.reduce((sum, row) => {
      const selectedItem = row.querySelector(".order-item");
      const quantity = Number(row.querySelector(".order-quantity").value || 0);
      return sum + Number(selectedItem.dataset.price || 0) * quantity;
    }, 0);
    emptyOrderMessage.hidden = rows.length > 0;
    CrumbCo.$("#order-total").textContent = `₱${total.toLocaleString()}`;
    CrumbCo.updatePayment(total);
  };
  itemsContainer.addEventListener("input", updateTotal);
  itemsContainer.addEventListener("click", (event) => {
    const quantityButton = event.target.closest("[data-quantity-change]");
    if (!quantityButton) return;
    const row = quantityButton.closest(".order-item-row");
    const quantityInput = row.querySelector(".order-quantity");
    const nextQuantity =
      Number(quantityInput.value) +
      Number(quantityButton.dataset.quantityChange);
    if (nextQuantity <= 0) {
      row.remove();
    } else {
      quantityInput.value = Math.min(99, nextQuantity);
    }
    updateTotal();
  });
  productSearch.addEventListener("input", renderProductCatalog);
  productFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeProductCategory = button.dataset.category;
    renderProductFilters();
    renderProductCatalog();
  });
  productGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-product-id]");
    if (!card) return;
    const product = CrumbCo.products.find(
      (item) => String(item.id) === card.dataset.productId,
    );
    CrumbCo.addOrderItem(product);
  });
  renderProductFilters();
  renderProductCatalog();
  const dateInput = CrumbCo.$("#order-date");
  const today = new Date();
  const dateValue = today.toISOString().slice(0, 10);
  dateInput.min = dateValue;
  dateInput.value = dateValue;
  CrumbCo.$("#new-order-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const customer = CrumbCo.$("#order-customer").value.trim();
    const orderItems = [
      ...itemsContainer.querySelectorAll(".order-item-row"),
    ].map((row) => {
      const selectedItem = row.querySelector(".order-item");
      const quantity = Number(row.querySelector(".order-quantity").value);
      return {
        name: selectedItem.value,
        quantity,
        price: Number(selectedItem.dataset.price),
      };
    });
    if (!orderItems.length) {
      CrumbCo.showToast("Choose at least one product before creating the order.");
      productSearch.focus();
      return;
    }
    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const paidAmount = Number(CrumbCo.$("#order-paid").value || 0);
    if (paidAmount < totalAmount) {
      CrumbCo.updatePayment(totalAmount);
      CrumbCo.$("#order-paid").focus();
      return;
    }
    const pickupDate = new Date(
      `${dateInput.value}T${CrumbCo.$("#order-time").value}`,
    );
    CrumbCo.api("/orders", {
      method: "POST",
      body: JSON.stringify({
        customer,
        items: orderItems,
        total: totalAmount,
        pickup_at: pickupDate.toISOString(),
      }),
    })
      .then(async () => {
        await CrumbCo.loadDatabaseState();
        CrumbCo.renderOrders();
        if (CrumbCo.refreshDashboard) {
          CrumbCo.refreshDashboard(CrumbCo.$("#sales-period").value).catch(
            (error) =>
              CrumbCo.showToast(`Unable to refresh the overview: ${error.message}`),
          );
        }
        CrumbCo.closeOrderModal();
        CrumbCo.$("#new-order-form").reset();
        itemsContainer.innerHTML = "";
        dateInput.value = dateValue;
        CrumbCo.$("#order-paid").value = 0;
        updateTotal();
        CrumbCo.showToast(`Order created for ${customer}.`);
      })
      .catch((error) => CrumbCo.showToast(error.message));
  });
  CrumbCo.renderOrders();
  updateTotal();
};

CrumbCo.updatePayment = (total) => {
  const paidInput = CrumbCo.$("#order-paid");
  const changeElement = CrumbCo.$("#order-change");
  const messageElement = CrumbCo.$("#payment-message");
  if (!paidInput || !changeElement || !messageElement) return;
  const paid = Number(paidInput.value || 0);
  const difference = paid - total;
  if (difference < 0) {
    changeElement.textContent = "₱0";
    changeElement.classList.add("insufficient");
    messageElement.textContent = `Not enough payment — ₱${Math.abs(difference).toLocaleString()} still needed`;
    messageElement.classList.add("insufficient");
  } else {
    changeElement.textContent = `₱${difference.toLocaleString()}`;
    changeElement.classList.remove("insufficient");
    messageElement.textContent =
      difference > 0 ? "Payment received" : "Exact payment";
    messageElement.classList.remove("insufficient");
  }
};

CrumbCo.orderModalOpener = null;
CrumbCo.openOrderModal = () => {
  if (!CrumbCo.canCreateSales()) {
    CrumbCo.showToast("Only cashier accounts can create sales.");
    return;
  }
  const activeElement = document.activeElement;
  if (!CrumbCo.$("#order-modal").contains(activeElement)) {
    CrumbCo.orderModalOpener = activeElement;
  }
  CrumbCo.$("#order-modal").classList.remove("hidden");
  CrumbCo.$("#order-paid").value = 0;
  const total = [
    ...document.querySelectorAll("#order-items .order-item-row"),
  ].reduce((sum, row) => {
    const selectedItem = row.querySelector(".order-item");
    return (
      sum +
      Number(selectedItem.dataset.price || 0) *
        Number(row.querySelector(".order-quantity").value || 0)
    );
  }, 0);
  CrumbCo.updatePayment(total);
  CrumbCo.$("#order-customer").focus();
};

CrumbCo.closeOrderModal = () => {
  CrumbCo.$("#order-modal").classList.add("hidden");
  if (
    CrumbCo.orderModalOpener instanceof HTMLElement &&
    CrumbCo.orderModalOpener.isConnected &&
    CrumbCo.orderModalOpener.getClientRects().length > 0
  ) {
    CrumbCo.orderModalOpener.focus();
  } else {
    CrumbCo.$("#new-order-btn-2").focus();
  }
  CrumbCo.orderModalOpener = null;
};
