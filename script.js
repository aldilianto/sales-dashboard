let lineChart, barChart, pieCategoryChart, pieProductChart;
let rawData = [];

// =====================
// DATE PARSER
// =====================
function parseDate(dateStr) {
  const [day, mon, year] = dateStr.split('-');
  const months = {
    Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5,
    Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11
  };
  return new Date(2000 + parseInt(year), months[mon], parseInt(day));
}

// =====================
// LOAD DATA
// =====================
fetch('dataset.csv')
  .then(res => res.text())
  .then(data => {

    const rows = data.split(/\r?\n/).slice(1);

    let categories = new Set();
    let products = new Set();

    rows.forEach(row => {
      if (!row.trim()) return;

      let cols = row.split(',');
      if (cols.length < 4) return;

      let date = cols[0].trim();
      let product = cols[1].trim();
      let category = cols[2].trim();
      let sales = parseFloat(cols[3]);

      if (isNaN(sales)) return;

      rawData.push({ date, product, category, sales });

      categories.add(category);
      products.add(product);
    });

    createCheckbox('categoryFilter', categories);
    createCheckbox('productFilter', products);

    ['startDate','endDate'].forEach(id => {
      document.getElementById(id).addEventListener('change', applyFilter);
    });

    applyFilter();
  });


// =====================
// CREATE CHECKBOX
// =====================
function createCheckbox(containerId, items) {
  const container = document.getElementById(containerId);

  items.forEach(item => {
    const label = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = item;
    checkbox.checked = true;

    checkbox.addEventListener('change', applyFilter);

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" " + item));

    container.appendChild(label);
  });
}


// =====================
// GET CHECKED VALUES
// =====================
function getChecked(containerId) {
  return Array.from(
    document.querySelectorAll(`#${containerId} input:checked`)
  ).map(el => el.value);
}


// =====================
// FILTER
// =====================
function applyFilter(extra = {}) {

  let cats = getChecked('categoryFilter');
  let prods = getChecked('productFilter');

  let start = document.getElementById('startDate').value;
  let end = document.getElementById('endDate').value;

  let filtered = rawData.filter(d => {

    let matchCat = cats.includes(d.category);
    let matchProd = prods.includes(d.product);

    if (extra.category && d.category !== extra.category) return false;
    if (extra.product && d.product !== extra.product) return false;

    let dateObj = parseDate(d.date);

    let matchDate = true;
    if (start) matchDate = dateObj >= new Date(start);
    if (end) matchDate = matchDate && dateObj <= new Date(end);

    return matchCat && matchProd && matchDate;
  });

  renderCharts(filtered);
}


// =====================
// COLOR GENERATOR
// =====================
function generateColors(n) {
  return Array.from({length: n}, (_, i) =>
    `hsl(${i * 360 / n}, 70%, 60%)`
  );
}


// =====================
// RENDER
// =====================
function renderCharts(data) {

  let salesByDateCategory = {};
  let monthlySales = {};
  let categorySales = {};
  let productSales = {};

  data.forEach(d => {

    if (!salesByDateCategory[d.date]) {
      salesByDateCategory[d.date] = {};
    }

    salesByDateCategory[d.date][d.category] =
      (salesByDateCategory[d.date][d.category] || 0) + d.sales;

    let month = d.date.substring(3);
    monthlySales[month] = (monthlySales[month] || 0) + d.sales;

    categorySales[d.category] = (categorySales[d.category] || 0) + d.sales;
    productSales[d.product] = (productSales[d.product] || 0) + d.sales;
  });

  const dates = Object.keys(salesByDateCategory);

  // LINE
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(lineChart = document.getElementById('lineChart'), {
    type: 'line',
    data: {
      labels: dates,
      datasets: Object.keys(categorySales).map((cat, i) => ({
        label: cat,
        data: dates.map(d => salesByDateCategory[d][cat] || 0),
        borderColor: `hsl(${i * 360 / 10},70%,50%)`,
        fill: false
      }))
    }
  });

  // BAR
  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: Object.keys(monthlySales),
      datasets: [{
        label: 'Monthly Sales',
        data: Object.values(monthlySales)
      }]
    }
  });

  // PIE CATEGORY
  if (pieCategoryChart) pieCategoryChart.destroy();
  pieCategoryChart = new Chart(document.getElementById('pieCategory'), {
    type: 'pie',
    data: {
      labels: Object.keys(categorySales),
      datasets: [{
        data: Object.values(categorySales),
        backgroundColor: generateColors(Object.keys(categorySales).length)
      }]
    },
    options: {
      onClick: (evt, el) => {
        if (el.length) {
          let i = el[0].index;
          applyFilter({ category: pieCategoryChart.data.labels[i] });
        }
      }
    }
  });

  // PIE PRODUCT (FIX WARNA)
  let sorted = Object.entries(productSales).sort((a,b)=>b[1]-a[1]);

  let labels = sorted.map(p=>p[0]);
  let values = sorted.map(p=>p[1]);

  let colors = generateColors(labels.length);

  // highlight top product
  colors[0] = '#ff0000';

  if (pieProductChart) pieProductChart.destroy();
  pieProductChart = new Chart(document.getElementById('pieProduct'), {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors
      }]
    },
    options: {
      onClick: (evt, el) => {
        if (el.length) {
          let i = el[0].index;
          applyFilter({ product: labels[i] });
        }
      }
    }
  });
}