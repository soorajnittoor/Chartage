let chart;
let clickedIndex = null;
let pickr = null;
let currentPickerEl = null;

document.getElementById('csvInput').addEventListener('change', handleCSVUpload);
document.getElementById('colorBtn').addEventListener('click', showColorPickerNextToColorButton);

function handleCSVUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const text = event.target.result.trim();
    const lines = text.split('\n');
    if (lines.length >= 2) {
      document.getElementById('labelInput').value = lines[0];
      document.getElementById('dataInput').value = lines[1];
    }
  };
  reader.readAsText(file);
}

function renderChart() {
  const labels = document.getElementById('labelInput').value.trim().split(',').map(l => l.trim());
  const data = document.getElementById('dataInput').value.trim().split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
  const type = document.getElementById('chartType').value;
  const ctx = document.getElementById('myChart').getContext('2d');

  if (!['scatter', 'bubble'].includes(type) && labels.length !== data.length) {
    alert("Labels and values count must match.");
    return;
  }

  const backgroundColors = generateColors(data.length);

  let dataConfig = {
    labels: labels,
    datasets: [{
      label: 'Your Data',
      data: data,
      backgroundColor: backgroundColors,
      borderColor: '#000',
      borderWidth: 1,
    }]
  };

  if (type === 'scatter') {
    dataConfig = {
      datasets: [{
        label: 'Scatter Data',
        data: data.map((y, x) => ({ x, y })),
        backgroundColor: backgroundColors[0]
      }]
    };
  }

  if (type === 'bubble') {
    dataConfig = {
      datasets: [{
        label: 'Bubble Data',
        data: data.map((v, i) => ({ x: i, y: v, r: Math.sqrt(v) || 5 })),
        backgroundColor: backgroundColors[0]
      }]
    };
  }

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: type,
    data: dataConfig,
    options: {
      responsive: true,
      onClick: (e) => {
        const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
        if (points.length) {
          clickedIndex = points[0].index;
          document.getElementById('colorBtn').disabled = false;
        }
      },
      plugins: {
        legend: { labels: { color: '#fff', font: { weight: 'bold' } } },
        tooltip: { bodyColor: '#fff', backgroundColor: '#000', titleColor: '#fff' }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    },
    plugins: [{
      id: 'labelStroker',
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((point, idx) => {
            const value = dataset.data[idx];
            const label = typeof value === 'object' ? `${value.y}` : `${value}`;
            const { x, y } = point.tooltipPosition();
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#000';
            ctx.strokeText(label, x, y);
            ctx.fillStyle = '#fff';
            ctx.fillText(label, x, y);
          });
        });
        ctx.restore();
      }
    }]
  });

  document.getElementById('downloadPng').disabled = false;
  document.getElementById('downloadJpeg').disabled = false;
  document.getElementById('colorBtn').disabled = true;
}

function generateColors(n) {
  const palette = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#577590', '#277da1', '#9b5de5'];
  return Array.from({ length: n }, (_, i) => palette[i % palette.length]);
}

function showColorPickerNextToColorButton() {
  if (clickedIndex === null || !chart) return;

  if (pickr) {
    pickr.destroyAndRemove();
    pickr = null;
  }

  const dummy = document.createElement('div');
  dummy.style.display = 'none';
  document.body.appendChild(dummy);

  pickr = Pickr.create({
    el: dummy, 
    theme: 'nano',
    default: chart.data.datasets[0].backgroundColor[clickedIndex],
    position: 'right-start',
    components: {
      preview: true,
      opacity: true,
      hue: true,
      interaction: {
        hex: true,
        rgba: true,
        input: true,
        clear: true,
        save: true
      }
    }
  });

  pickr.on('save', (color) => {
    const newColor = color.toHEXA().toString();
    chart.data.datasets[0].backgroundColor[clickedIndex] = newColor;
    chart.update();
    pickr.hide();
  });

  pickr.show();

  setTimeout(() => {
    const pickerRoot = document.querySelector('.pickr');
    const button = document.getElementById('colorBtn');
    const rect = button.getBoundingClientRect();

    if (pickerRoot) {
      pickerRoot.style.position = 'fixed';
      pickerRoot.style.left = `${rect.right + 10}px`;
      pickerRoot.style.top = `${rect.top + window.scrollY}px`;
      pickerRoot.style.zIndex = '9999';
      pickerRoot.style.display = 'block';
    }
  }, 10);
}


function downloadChart(type) {
  if (!chart) return;
  const link = document.createElement('a');
  link.download = `chartage-chart.${type}`;
  link.href = document.getElementById('myChart').toDataURL(`image/${type}`);
  link.click();
}
