window.CrumbCo = window.CrumbCo || {};

CrumbCo.$ = (selector) => document.querySelector(selector);

CrumbCo.openModal = ({title = "JE Café", message = "", fields = [], confirmText = "OK", cancelText = "Cancel", showCancel = fields.length > 0} = {}) => {
  const modal = CrumbCo.$("#system-modal");
  const fieldsContainer = CrumbCo.$("#system-modal-fields");
  const confirmButton = CrumbCo.$("#system-modal-confirm");
  const cancelButton = CrumbCo.$("#system-modal-cancel");
  CrumbCo.$("#system-modal-title").textContent = title;
  confirmButton.classList.toggle("danger", /delete/i.test(title));
  CrumbCo.$("#system-modal-message").textContent = message;
  fieldsContainer.innerHTML = fields.map((field) => `<div class="form-field"><label for="system-field-${field.name}">${field.label}</label><input id="system-field-${field.name}" type="${field.type || "text"}" ${field.accept ? `accept="${field.accept}"` : ""} ${field.required === false ? "" : "required"} autocomplete="${field.type === "password" ? "new-password" : "off"}"></div>`).join("");
  cancelButton.textContent = cancelText;
  cancelButton.classList.toggle("hidden", !showCancel);
  confirmButton.textContent = confirmText;
  modal.classList.remove("hidden");
  const previousFocus = document.activeElement;
  return new Promise((resolve) => {
    const close = (result) => {
      modal.classList.add("hidden");
      confirmButton.onclick = null;
      cancelButton.onclick = null;
      CrumbCo.$("#system-modal-close").onclick = null;
      modal.removeEventListener("keydown", handleKeydown);
      modal.removeEventListener("click", handleBackdropClick);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
      resolve(result);
    };
    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...modal.querySelectorAll(
        "button:not([disabled]):not(.hidden), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      )].filter((element) => element.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        modal.focus();
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
    };
    const handleBackdropClick = (event) => {
      if (event.target === modal) close(null);
    };
    modal.addEventListener("keydown", handleKeydown);
    modal.addEventListener("click", handleBackdropClick);
    confirmButton.onclick = () => {
      const inputs = fields.map((field) =>
        CrumbCo.$(`#system-field-${field.name}`),
      );
      const invalidInput = inputs.find((input) => !input.checkValidity());
      if (invalidInput) {
        invalidInput.reportValidity();
        invalidInput.focus();
        return;
      }
      close(Object.fromEntries(fields.map((field, index) => {
        const input = inputs[index];
        return [
          field.name,
          field.type === "file" ? input.files[0] || null : input.value,
        ];
      })));
    };
    cancelButton.onclick = () => close(null);
    CrumbCo.$("#system-modal-close").onclick = () => close(null);
    const firstField = fields.length
      ? CrumbCo.$(`#system-field-${fields[0].name}`)
      : confirmButton;
    firstField.focus();
  });
};

CrumbCo.showToast = (message) => {
  const toast = CrumbCo.$("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(CrumbCo.toastTimeout);
  CrumbCo.toastTimeout = window.setTimeout(
    () => toast.classList.remove("show"),
    5000,
  );
};

CrumbCo.openSection = (section) => {
  const user = CrumbCo.currentUser ? CrumbCo.currentUser() : null;
  if (section === "settings" && (!user || !["Admin", "Manager"].includes(user.role))) {
    CrumbCo.showToast("Admin settings are available to managers only.");
    return;
  }
  document.querySelectorAll(".page-section").forEach((page) => {
    page.classList.toggle("active-section", page.id === section);
  });
  document.querySelectorAll(".nav-item[data-section]").forEach((item) => {
    item.classList.toggle("active", item.dataset.section === section);
    if (item.dataset.section === section) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });
  const titles = {
    overview: "Good morning, Adrian",
    orders: "Orders",
    products: "Products",
    inventory: "Inventory",
    customers: "Customers",
    reports: "Reports",
    settings: "Admin settings",
  };
  CrumbCo.$("#page-title").innerHTML = `${titles[section]} <span aria-hidden="true">✦</span>`;
  if (CrumbCo.closeMobileNavigation) CrumbCo.closeMobileNavigation();
  if (window.matchMedia("(max-width: 700px)").matches) {
    CrumbCo.$("#page-title").focus();
  }
};
