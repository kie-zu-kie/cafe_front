window.CrumbCo = window.CrumbCo || {};
CrumbCo.authenticatedUser = null;

CrumbCo.setAuthenticatedView = (authenticated) => {
  CrumbCo.$("#login-view").classList.toggle("hidden", authenticated);
  CrumbCo.$("#app-view").classList.toggle("hidden", !authenticated);
  CrumbCo.$(".skip-link").href = authenticated
    ? "#main-content"
    : "#email";
};

CrumbCo.currentUser = () => {
  return CrumbCo.authenticatedUser;
};

CrumbCo.canCreateSales = () => CrumbCo.currentUser()?.role === "Cashier";

CrumbCo.syncSalesPermissions = () => {
  document.querySelectorAll(".create-order-action").forEach((button) => {
    button.hidden = !CrumbCo.canCreateSales();
  });
};

CrumbCo.initAuth = () => {
  CrumbCo.$("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.target.querySelector("button[type='submit']");
    const buttonLabel = button.querySelector("#login-button-label");
    const originalLabel = buttonLabel.textContent;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    buttonLabel.textContent = "Signing in...";
    button.querySelector(".login-btn-arrow").classList.add("hidden");
    button.querySelector(".login-spinner").classList.remove("hidden");
    try {
      const user = await CrumbCo.api("/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: CrumbCo.$("#email").value,
          password: CrumbCo.$("#password").value
        })
      });
      CrumbCo.authenticatedUser = user;
      CrumbCo.$("#current-user-name").textContent = user.name;
      CrumbCo.$("#current-user-role").textContent = user.role;
      CrumbCo.syncSalesPermissions();
      if (CrumbCo.renderOrders) CrumbCo.renderOrders();
      if (CrumbCo.initAdmin) CrumbCo.initAdmin();
      if (CrumbCo.renderProducts) CrumbCo.renderProducts();
      CrumbCo.setAuthenticatedView(true);
      CrumbCo.showToast(`Welcome back, ${user.name}!`);
    } catch (error) {
      CrumbCo.showToast(error.message);
    } finally {
      button.disabled = false;
      button.setAttribute("aria-busy", "false");
      buttonLabel.textContent = originalLabel;
      button.querySelector(".login-btn-arrow").classList.remove("hidden");
      button.querySelector(".login-spinner").classList.add("hidden");
    }
  });

  CrumbCo.$("#toggle-password").addEventListener("click", () => {
    const password = CrumbCo.$("#password");
    password.type = password.type === "password" ? "text" : "password";
    CrumbCo.$("#toggle-password").textContent =
      password.type === "password" ? "Show" : "Hide";
  });

  CrumbCo.$("#logout-btn").addEventListener("click", () => {
    CrumbCo.authenticatedUser = null;
    CrumbCo.syncSalesPermissions();
    if (CrumbCo.renderOrders) CrumbCo.renderOrders();
    if (CrumbCo.renderProducts) CrumbCo.renderProducts();
    CrumbCo.setAuthenticatedView(false);
  });

  const user = CrumbCo.currentUser();
  if (user) {
    CrumbCo.$("#current-user-name").textContent = user.name;
    CrumbCo.$("#current-user-role").textContent = user.role;
  }
  CrumbCo.syncSalesPermissions();
  CrumbCo.setAuthenticatedView(Boolean(user));
};
