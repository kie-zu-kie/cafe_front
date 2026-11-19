window.CrumbCo = window.CrumbCo || {};

CrumbCo.initAdmin = () => {
  const user = CrumbCo.currentUser();
  const settingsButton = document.querySelector(".settings");
  const adminLink = document.querySelector("[data-section='settings']");
  const isManager = user && ["Admin", "Manager"].includes(user.role);
  if (!isManager) {
    settingsButton.classList.add("hidden");
    adminLink.classList.add("hidden");
    CrumbCo.$("#settings").classList.remove("active-section");
    return;
  }
  settingsButton.classList.remove("hidden");
  adminLink.classList.remove("hidden");

  const headers = () => ({
    "X-User-Id": String(CrumbCo.currentUser().id)
  });
  const table = CrumbCo.$("#cashiers-table");
  const render = (cashiers) => {
    table.innerHTML = cashiers.map((cashier) => `
      <tr><td><strong>${cashier.name}</strong></td><td>${cashier.username}</td><td>${cashier.email}</td>
      <td>${cashier.is_active ? "Active" : "Inactive"}</td>
      <td><button class="text-btn cashier-toggle" data-id="${cashier.id}" data-active="${cashier.is_active}">${cashier.is_active ? "Deactivate" : "Activate"}</button>
      <button class="text-btn cashier-reset" data-id="${cashier.id}">Reset password</button></td></tr>
    `).join("") || `<tr><td colspan="5" class="muted">No cashier accounts yet.</td></tr>`;
  };
  const load = async () => {
    try {
      render(await CrumbCo.api("/admin/users", {headers: headers()}));
    } catch (error) {
      CrumbCo.showToast(error.message);
    }
  };
  settingsButton.addEventListener("click", () => CrumbCo.openSection("settings"));
  CrumbCo.$("#add-cashier-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
      name: form.elements.namedItem("name").value.trim(),
      username: form.elements.namedItem("username").value.trim(),
      email: form.elements.namedItem("email").value.trim(),
      password: form.elements.namedItem("password").value
    };
    const missing = ["name", "username", "email", "password"].filter((field) => !payload[field]);
    if (missing.length) {
      CrumbCo.showToast(`Please complete: ${missing.join(", ")}`);
      return;
    }
    try {
      await CrumbCo.api("/admin/users", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload)
      });
      form.reset();
      await load();
      CrumbCo.showToast("Cashier account created.");
    } catch (error) {
      CrumbCo.showToast(error.message);
    }
  });
  table.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    try {
      if (button.classList.contains("cashier-toggle")) {
        await CrumbCo.api(`/admin/users/${button.dataset.id}`, {
          method: "PATCH", headers: headers(),
          body: JSON.stringify({is_active: button.dataset.active !== "true"})
        });
      } else if (button.classList.contains("cashier-reset")) {
        const result = await CrumbCo.openModal({
          title: "Reset cashier password",
          message: "Enter a new password for this cashier.",
          fields: [{name: "password", label: "New password", type: "password"}],
          confirmText: "Reset password"
        });
        if (!result || !result.password) return;
        await CrumbCo.api(`/admin/users/${button.dataset.id}`, {
          method: "PATCH", headers: headers(), body: JSON.stringify({password: result.password})
        });
      }
      await load();
      CrumbCo.showToast("Cashier account updated.");
    } catch (error) {
      CrumbCo.showToast(error.message);
    }
  });
  load();
};
