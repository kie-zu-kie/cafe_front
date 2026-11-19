window.CrumbCo = window.CrumbCo || {};

CrumbCo.dashboardRequestId = 0;

CrumbCo.refreshDashboard = async (period = "7d") => {
  const requestId = ++CrumbCo.dashboardRequestId;
  const dashboard = await CrumbCo.api(
    `/dashboard?period=${encodeURIComponent(period)}`,
  );
  if (requestId !== CrumbCo.dashboardRequestId) return;
  const formatCurrency = (amount) =>
    `₱${Number(amount || 0).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })}`;
  const escape = CrumbCo.escapeHtml;
  const lowStock = Number(dashboard.low_stock || 0);
  const inventoryTotal = Number(dashboard.inventory_total || 0);

  CrumbCo.$("#sales-today").textContent = formatCurrency(dashboard.sales_today);
  CrumbCo.$("#orders-today").textContent = Number(
    dashboard.orders_today || 0,
  ).toLocaleString();
  CrumbCo.$("#average-order").textContent = formatCurrency(
    dashboard.average_order,
  );
  CrumbCo.$("#low-stock-count").textContent = lowStock.toLocaleString();
  CrumbCo.$("#low-stock-caption").textContent =
    `${lowStock} of ${inventoryTotal} ingredient${inventoryTotal === 1 ? "" : "s"} below reorder level`;
  CrumbCo.$("#low-stock-bar").style.width = inventoryTotal
    ? `${Math.min(100, (lowStock / inventoryTotal) * 100)}%`
    : "0%";

  CrumbCo.$("#top-products").innerHTML =
    dashboard.top_products
      .map((product) => {
        const category = CrumbCo.normalizeProductCategory(product.category);
        const categoryMeta = CrumbCo.productCategories[category];
        return `<div class="product-row"><span class="product-thumb ${category}">${categoryMeta.emoji}</span><div><strong>${escape(product.name)}</strong><small>${Number(product.quantity).toLocaleString()} sold</small></div><b>${formatCurrency(product.sales)}</b></div>`;
      })
      .join("") || `<p class="muted">No product sales in the last 7 days.</p>`;

  CrumbCo.$("#schedule").innerHTML =
    dashboard.schedule
      .map(
        (item) =>
          `<div><time>${escape(item.time)}</time><p class="schedule-event peach-event"><strong>Order · #${escape(item.id)}</strong><small>${escape(item.customer)} · ${escape(item.items || "No items")}</small></p></div>`,
      )
      .join("") || `<p class="muted">No orders scheduled today.</p>`;

  const chartData = dashboard.sales_by_day;
  const values = chartData.map((item) => Number(item.sales) || 0);
  const maxSales = Math.max(0, ...values);
  const rawStep = maxSales > 0 ? maxSales / 4 : 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].find(
    (candidate) => candidate * magnitude >= rawStep,
  ) * magnitude;
  const chartMax = step * 4;
  const points = values.map((value, index) => ({
    x: values.length > 1 ? (index / (values.length - 1)) * 700 : 350,
    y: 198 - (value / chartMax) * 176,
  }));
  const linePath = points.length
    ? points
        .map((point, index) =>
          `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
        )
        .join(" ")
    : "";
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  CrumbCo.$("#sales-chart-line").setAttribute("d", linePath);
  CrumbCo.$("#sales-chart-area").setAttribute(
    "d",
    points.length
      ? `${linePath} L${lastPoint.x.toFixed(2)},220 L${firstPoint.x.toFixed(2)},220 Z`
      : "",
  );
  CrumbCo.$("#sales-chart-y-labels").innerHTML = [4, 3, 2, 1, 0]
    .map((tick) => `<span>${formatCurrency(step * tick)}</span>`)
    .join("");

  const labelCount = Math.min(7, chartData.length);
  const labelIndexes = Array.from({ length: labelCount }, (_, index) =>
    labelCount === 1
      ? 0
      : Math.round((index * (chartData.length - 1)) / (labelCount - 1)),
  );
  CrumbCo.$("#sales-chart-x-labels").innerHTML = labelIndexes
    .map((index) => `<span>${escape(chartData[index].label)}</span>`)
    .join("");
  CrumbCo.$("#sales-chart-x-labels").classList.toggle(
    "single-label",
    labelIndexes.length === 1,
  );
  CrumbCo.$("#sales-chart-svg").setAttribute(
    "aria-label",
    `Sales from ${chartData[0]?.label || "the selected period"} to ${chartData[chartData.length - 1]?.label || "today"}`,
  );
  CrumbCo.$("#sales-chart-caption").textContent =
    period === "month"
      ? "Daily revenue this month"
      : "Daily revenue for the last 7 days";
};

CrumbCo.initDashboard = async () => {
  const periodSelect = CrumbCo.$("#sales-period");
  periodSelect.addEventListener("change", () => {
    CrumbCo.refreshDashboard(periodSelect.value).catch((error) => {
      CrumbCo.showToast(`Unable to update the sales chart: ${error.message}`);
    });
  });
  await CrumbCo.refreshDashboard(periodSelect.value);
};

CrumbCo.initReports = async () => {
  const report = await CrumbCo.api("/reports");
  const cards = document.querySelectorAll("#reports .report-card strong");
  cards[0].textContent = `₱${report.gross_revenue.toLocaleString()}`;
  cards[1].textContent = report.total_orders.toLocaleString();
  cards[2].textContent = report.best_seller.name;
  document.querySelector(
    "#reports .report-card:nth-child(3) small",
  ).textContent = `${report.best_seller.quantity} units sold`;
};
