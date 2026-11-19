window.CrumbCo = window.CrumbCo || {};

CrumbCo.initInventory = () => {
  const modal = CrumbCo.$("#inventory-modal");
  const form = CrumbCo.$("#add-ingredient-form");
  const table = CrumbCo.$("#inventory-table");
  const count = CrumbCo.$("#inventory-count");
  const lowCount = CrumbCo.$("#inventory-low-count");
  const reorderModal = CrumbCo.$("#reorder-modal");
  const reorderList = CrumbCo.$("#reorder-list");

  let modalOpener = null;
  let reorderModalOpener = null;
  const closeModal = () => {
    modal.classList.add("hidden");
    if (modalOpener instanceof HTMLElement && modalOpener.isConnected) {
      modalOpener.focus();
    }
    modalOpener = null;
  };
  const closeReorderModal = () => {
    reorderModal.classList.add("hidden");
    if (
      reorderModalOpener instanceof HTMLElement &&
      reorderModalOpener.isConnected
    ) {
      reorderModalOpener.focus();
    }
    reorderModalOpener = null;
  };
  const updateStatus = (row) => {
    const onHand = Number(row.dataset.onHand);
    const reorderLevel = Number(row.dataset.reorderLevel);
    const needsReorder = onHand < reorderLevel;
    const status = row.querySelector(".status");
    status.className = `status ${needsReorder ? "low" : "ready"}`;
    status.textContent = needsReorder ? "Reorder" : "In stock";
    return needsReorder;
  };
  const renderRows = () => {
    table.innerHTML = "";
    CrumbCo.inventory.forEach((ingredient) => {
      const row = document.createElement("tr");
      row.dataset.onHand = ingredient.on_hand;
      row.dataset.reorderLevel = ingredient.reorder_level;
      [
        ingredient.name,
        ingredient.category,
        `${ingredient.on_hand} ${ingredient.unit}`,
        `${ingredient.reorder_level} ${ingredient.unit}`,
        ingredient.supplier,
      ].forEach((value, index) => {
        const cell = document.createElement("td");
        if (index === 0) {
          const strong = document.createElement("strong");
          strong.textContent = value;
          cell.appendChild(strong);
        } else cell.textContent = value;
        row.appendChild(cell);
      });
      const statusCell = document.createElement("td");
      statusCell.innerHTML = '<span class="status"></span>';
      row.appendChild(statusCell);
      const actionCell = document.createElement("td");
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "text-btn ingredient-edit";
      editButton.dataset.id = ingredient.id;
      editButton.textContent = "Edit";
      actionCell.appendChild(editButton);
      row.appendChild(actionCell);
      table.appendChild(row);
    });
  };
  const renderSummary = () => {
    const lowItems = [...table.rows].filter(updateStatus).length;
    count.textContent = table.rows.length;
    lowCount.textContent = `${lowItems} item${lowItems === 1 ? "" : "s"}`;
  };
  const renderReorderList = () => {
    const items = CrumbCo.inventory.filter(
      (ingredient) => Number(ingredient.on_hand) < Number(ingredient.reorder_level),
    );
    reorderList.innerHTML = "";
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "muted reorder-empty";
      empty.textContent = "Everything is stocked above its reorder level.";
      reorderList.appendChild(empty);
      return;
    }
    items.forEach((ingredient) => {
      const card = document.createElement("div");
      card.className = "reorder-item";
      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = ingredient.name;
      const supplier = document.createElement("small");
      supplier.textContent = ingredient.supplier ? `Supplier: ${ingredient.supplier}` : "No supplier listed";
      details.append(name, supplier);
      const quantity = document.createElement("div");
      quantity.className = "reorder-quantity";
      const amount = document.createElement("strong");
      amount.textContent = `${(Number(ingredient.reorder_level) - Number(ingredient.on_hand)).toLocaleString()} ${ingredient.unit}`;
      const label = document.createElement("small");
      label.textContent = `Order quantity · ${ingredient.on_hand} ${ingredient.unit} on hand`;
      quantity.append(amount, label);
      card.append(details, quantity);
      reorderList.appendChild(card);
    });
  };

  CrumbCo.$("#add-ingredient-btn").addEventListener("click", () => {
    modalOpener = document.activeElement;
    form.reset();
    form.dataset.editingId = "";
    CrumbCo.$("#inventory-modal-title").textContent = "Add ingredient";
    modal.classList.remove("hidden");
    CrumbCo.$("#ingredient-name").focus();
  });
  CrumbCo.$("#close-inventory-modal").addEventListener("click", closeModal);
  CrumbCo.$("#cancel-inventory").addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  CrumbCo.$("#inventory-low-btn").addEventListener("click", () => {
    reorderModalOpener = document.activeElement;
    renderReorderList();
    reorderModal.classList.remove("hidden");
    CrumbCo.$("#close-reorder-modal").focus();
  });
  CrumbCo.$("#close-reorder-modal").addEventListener("click", closeReorderModal);
  CrumbCo.$("#close-reorder-modal-footer").addEventListener("click", closeReorderModal);
  reorderModal.addEventListener("click", (event) => {
    if (event.target === reorderModal) closeReorderModal();
  });

  table.addEventListener("click", (event) => {
    const button = event.target.closest(".ingredient-edit");
    if (!button) return;
    const ingredient = CrumbCo.inventory.find((item) => String(item.id) === button.dataset.id);
    if (!ingredient) return;
    modalOpener = button;
    form.dataset.editingId = ingredient.id;
    CrumbCo.$("#inventory-modal-title").textContent = "Edit ingredient";
    CrumbCo.$("#ingredient-name").value = ingredient.name;
    CrumbCo.$("#ingredient-category").value = ingredient.category;
    CrumbCo.$("#ingredient-supplier").value = ingredient.supplier;
    CrumbCo.$("#ingredient-on-hand").value = ingredient.on_hand;
    CrumbCo.$("#ingredient-unit").value = ingredient.unit;
    CrumbCo.$("#ingredient-reorder-level").value = ingredient.reorder_level;
    modal.classList.remove("hidden");
    CrumbCo.$("#ingredient-name").focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const onHand = Number(CrumbCo.$("#ingredient-on-hand").value);
    const reorderLevel = Number(CrumbCo.$("#ingredient-reorder-level").value);
    const name = CrumbCo.$("#ingredient-name").value.trim();
    const category = CrumbCo.$("#ingredient-category").value;
    const supplier = CrumbCo.$("#ingredient-supplier").value.trim();
    const unit = CrumbCo.$("#ingredient-unit").value.trim();
    const editingId = form.dataset.editingId;
    try {
      await CrumbCo.api(editingId ? `/ingredients/${editingId}` : "/ingredients", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({name, category, on_hand: onHand, reorder_level: reorderLevel, supplier, unit}),
      });
      await CrumbCo.loadDatabaseState();
      renderRows();
      renderSummary();
      if (CrumbCo.refreshDashboard) {
        CrumbCo.refreshDashboard(CrumbCo.$("#sales-period").value).catch(
          (error) =>
            CrumbCo.showToast(`Unable to refresh the overview: ${error.message}`),
        );
      }
      form.reset();
      form.dataset.editingId = "";
      CrumbCo.$("#inventory-modal-title").textContent = "Add ingredient";
      closeModal();
      CrumbCo.showToast(`${name} ${editingId ? "updated" : "added to inventory"}.`);
    } catch (error) {
      CrumbCo.showToast(error.message);
    }
  });
  renderRows();
  renderSummary();
};
