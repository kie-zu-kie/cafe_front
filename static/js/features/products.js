window.CrumbCo = window.CrumbCo || {};

CrumbCo.escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

CrumbCo.renderProducts = (list = CrumbCo.products) => {
  const isManager = ["Admin", "Manager"].includes(CrumbCo.currentUser()?.role);
  CrumbCo.$("#add-product-btn").hidden = !isManager;
  const groups = Object.entries(CrumbCo.productCategories).map(
    ([category, config]) => ({ category, title: config.title }),
  );
  CrumbCo.$("#product-cards").innerHTML =
    groups
      .map((group) => {
        const products = list.filter(
          (product) => product.category === group.category,
        );
        if (!products.length) return "";
        return `<section class="product-group"><div class="product-group-heading"><h3>${group.title}</h3><span>${products.length} ${products.length === 1 ? "item" : "items"}</span></div><div class="product-cards">${products
          .map((product) => {
            const categoryMeta =
              CrumbCo.productCategories[product.category] ||
              CrumbCo.productCategories.pastry;
            const imageContent = product.image_url
              ? `<img src="${CrumbCo.escapeHtml(product.image_url)}" alt="${CrumbCo.escapeHtml(product.name)}">`
              : categoryMeta.emoji;
            const productId = CrumbCo.escapeHtml(product.id);
            const managerActions = isManager
              ? `<button class="text-btn product-edit-btn" type="button" data-product-id="${productId}">Edit</button><button class="text-btn product-image-btn" type="button" data-product-id="${productId}">${product.image_url ? "Change image" : "Upload image"}</button><button class="text-btn product-delete-btn" type="button" data-product-id="${productId}">Delete</button>`
              : "";
            const orderAction = CrumbCo.canCreateSales()
              ? `<button class="filter-btn product-order-btn" type="button" data-product-id="${productId}">Add to order</button>`
              : "";
            return `<article class="product-card"><div class="product-image ${categoryMeta.image}">${imageContent}</div><div class="product-card-body"><h3>${CrumbCo.escapeHtml(product.name)}</h3><p>${CrumbCo.escapeHtml(product.description)}</p><div class="price-row"><span>${CrumbCo.escapeHtml(product.price)}</span><small>Available</small></div><div class="product-actions">${orderAction}${managerActions}</div></div></article>`;
          })
          .join("")}</div></section>`;
      })
      .join("") ||
    `<p class="muted empty-products">No products match your search.</p>`;
};

CrumbCo.initProducts = () => {
  const isManager = () =>
    ["Admin", "Manager"].includes(CrumbCo.currentUser()?.role);
  const uploadImage = async (product, file) => {
    const formData = new FormData();
    formData.append("image", file);
    const updatedProduct = await CrumbCo.api(
      `/products/${product.id}/image`,
      {
        method: "POST",
        body: formData,
      },
    );
    Object.assign(product, updatedProduct);
    CrumbCo.orders.forEach((order) => {
      order.item_details?.forEach((item) => {
        if (item.name === product.name) item.image_url = product.image_url;
      });
    });
    CrumbCo.renderProducts();
    if (CrumbCo.renderOrders) CrumbCo.renderOrders();
  };
  CrumbCo.$("#add-product-btn").addEventListener("click", async () => {
    if (!isManager()) return;
    const fields = [
      {name: "name", label: "Product name"},
      {name: "price", label: "Price (for example, ₱180 / cup)"},
      {name: "category", label: "Category: coffee, pastry, cookie or bread"}
    ];
    if (isManager()) {
      fields.push({
        name: "image",
        label: "Product photo (JPG, PNG, WebP; up to 5 MB)",
        type: "file",
        accept: "image/jpeg,image/png,image/webp",
        required: false,
      });
    }
    const productDetails = await CrumbCo.openModal({
      title: "Add product",
      message: "Enter the new product details.",
      fields,
      confirmText: "Add product",
    });
    if (!productDetails) return;
    const name = productDetails.name;
    const price = productDetails.price;
    const category = productDetails.category;
    if (!name.trim() || !price.trim() || !category.trim()) return;
    const normalizedCategory = CrumbCo.normalizeProductCategory(category);
    const categoryMeta =
      CrumbCo.productCategories[normalizedCategory] ||
      CrumbCo.productCategories.pastry;
    const product = {
      name: name.trim(),
      description: "Freshly prepared at JE Café",
      price: price.trim(),
      emoji: categoryMeta.emoji,
      image: categoryMeta.image,
      category: normalizedCategory,
    };
    CrumbCo.api("/products", {
      method: "POST",
      body: JSON.stringify({
        ...product,
        price: Number(product.price.replace(/[^\d.]/g, "")),
      }),
    })
      .then((savedProduct) => {
        CrumbCo.products.push(savedProduct);
        CrumbCo.renderProducts();
        if (!productDetails.image) {
          CrumbCo.showToast(`${name.trim()} added to the menu.`);
          return;
        }
        return uploadImage(savedProduct, productDetails.image)
          .then(() =>
            CrumbCo.showToast(`${name.trim()} added with its product photo.`),
          )
          .catch((error) =>
            CrumbCo.showToast(
              `${name.trim()} was added, but its photo could not be uploaded: ${error.message}`,
            ),
          );
      })
      .catch((error) => CrumbCo.showToast(error.message));
  });
  const searchInput = CrumbCo.$("#product-search");
  searchInput.addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();
    const topbarSearch = CrumbCo.$("#topbar-product-search");
    if (topbarSearch && topbarSearch.value !== event.target.value) {
      topbarSearch.value = event.target.value;
    }
    const category = document.querySelector(".product-filter.active").dataset
      .category;
    CrumbCo.renderProducts(
      CrumbCo.products.filter(
        (product) =>
          (category === "all" || product.category === category) &&
          `${product.name} ${product.description}`
            .toLowerCase()
            .includes(query),
      ),
    );
  });
  document.querySelectorAll(".product-filter").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".product-filter")
        .forEach((filter) =>
          filter.classList.toggle("active", filter === button),
        );
      searchInput.dispatchEvent(new Event("input"));
    });
  });
  CrumbCo.$("#product-cards").addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const product = CrumbCo.products.find(
      (item) => String(item.id) === button.dataset.productId,
    );
    if (!product) return;
    const productName = product.name;
    if (button.classList.contains("product-order-btn")) {
      CrumbCo.openSection("orders");
      CrumbCo.openOrderModal();
      CrumbCo.addOrderItem(product);
      CrumbCo.showToast(`${productName} is ready to add to an order.`);
    } else if (button.classList.contains("product-edit-btn")) {
      if (!isManager()) return;
      const result = await CrumbCo.openModal({
        title: "Update product price",
        message: `Enter a new price for ${product.name}.`,
        fields: [{name: "price", label: "Price"}],
        confirmText: "Save price"
      });
      if (!result || !result.price.trim()) return;
      const price = result.price;
      CrumbCo.api(`/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ price: Number(price.replace(/[^\d.]/g, "")) }),
      })
        .then((updatedProduct) => {
          Object.assign(product, updatedProduct);
          CrumbCo.renderProducts();
          CrumbCo.showToast(`${product.name} updated.`);
        })
        .catch((error) => CrumbCo.showToast(error.message));
    } else if (button.classList.contains("product-image-btn")) {
      if (!isManager()) return;
      const result = await CrumbCo.openModal({
        title: product.image_url ? "Change product photo" : "Upload product photo",
        message: `Choose a clear photo of ${product.name} for the product catalog and order screen.`,
        fields: [{
          name: "image",
          label: "JPG, PNG, or WebP (up to 5 MB)",
          type: "file",
          accept: "image/jpeg,image/png,image/webp",
        }],
        confirmText: "Upload photo",
      });
      if (!result?.image) return;
      try {
        await uploadImage(product, result.image);
        CrumbCo.showToast(`${product.name}'s photo was updated.`);
      } catch (error) {
        CrumbCo.showToast(error.message);
      }
    } else if (button.classList.contains("product-delete-btn")) {
      if (!isManager()) return;
      const confirmed = await CrumbCo.openModal({
        title: "Delete product",
        message: `Remove ${product.name} from the available menu? Existing order history will be kept.`,
        confirmText: "Delete product",
        showCancel: true,
      });
      if (!confirmed) return;
      try {
        await CrumbCo.api(`/products/${product.id}`, { method: "DELETE" });
        CrumbCo.products = CrumbCo.products.filter(
          (item) => item.id !== product.id,
        );
        CrumbCo.renderProducts();
        CrumbCo.showToast(`${product.name} was removed from the menu.`);
      } catch (error) {
        CrumbCo.showToast(error.message);
      }
    }
  });
  CrumbCo.renderProducts();
};
