/**
 * Chart Components - Data Visualization
 * Phase 25: Professional UI/UX
 * Using Chart.js for lightweight, performant charts
 */

import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  ChartConfiguration
} from 'chart.js';

// Register Chart.js components
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
);

/* ============================================
   FORECAST CHART (P10/P50/P90)
   ============================================ */

interface ForecastDataPoint {
  date: string;
  p10: number;
  p50: number;
  p90: number;
}

let forecastChartInstance: Chart | null = null;

export function createForecastChart(
  canvasId: string,
  data: ForecastDataPoint[]
): Chart {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    throw new Error(`Canvas with id "${canvasId}" not found`);
  }
  
  // Destroy existing chart
  if (forecastChartInstance) {
    forecastChartInstance.destroy();
  }
  
  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: data.map(d => d.date),
      datasets: [
        {
          label: 'P90 (Upper Bound)',
          data: data.map(d => d.p90),
          borderColor: '#ff4444',
          backgroundColor: 'rgba(255, 68, 68, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4
        },
        {
          label: 'P50 (Median)',
          data: data.map(d => d.p50),
          borderColor: '#00ff88',
          backgroundColor: 'rgba(0, 255, 136, 0.1)',
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.4
        },
        {
          label: 'P10 (Lower Bound)',
          data: data.map(d => d.p10),
          borderColor: '#00aaff',
          backgroundColor: 'rgba(0, 170, 255, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        title: {
          display: true,
          text: '7-Day BTC Price Forecast',
          color: '#e6edf3',
          font: {
            family: 'Courier New',
            size: 16,
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#e6edf3',
            font: {
              family: 'Courier New',
              size: 12
            },
            usePointStyle: true,
            padding: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 20, 25, 0.95)',
          titleColor: '#e6edf3',
          bodyColor: '#8b949e',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              if (value === null) return label;
              return `${label}: $${value.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Forecast Horizon',
            color: '#8b949e',
            font: {
              family: 'Courier New',
              size: 12
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#8b949e',
            font: {
              family: 'Courier New',
              size: 11
            }
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'BTC Price (USD)',
            color: '#8b949e',
            font: {
              family: 'Courier New',
              size: 12
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#8b949e',
            font: {
              family: 'Courier New',
              size: 11
            },
            callback: (value) => {
              return `$${(Number(value) / 1000).toFixed(0)}k`;
            }
          }
        }
      }
    }
  };
  
  forecastChartInstance = new Chart(canvas, config);
  return forecastChartInstance;
}

export function updateForecastChart(data: ForecastDataPoint[]): void {
  if (!forecastChartInstance) return;
  
  forecastChartInstance.data.labels = data.map(d => d.date);
  forecastChartInstance.data.datasets[0].data = data.map(d => d.p90);
  forecastChartInstance.data.datasets[1].data = data.map(d => d.p50);
  forecastChartInstance.data.datasets[2].data = data.map(d => d.p10);
  
  forecastChartInstance.update('none'); // No animation for updates
}

/* ============================================
   PRICE HISTORY CHART (24H)
   ============================================ */

interface PricePoint {
  timestamp: number;
  price: number;
}

let priceChartInstance: Chart | null = null;

export function createPriceHistoryChart(
  canvasId: string,
  data: PricePoint[]
): Chart {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    throw new Error(`Canvas with id "${canvasId}" not found`);
  }
  
  // Destroy existing chart
  if (priceChartInstance) {
    priceChartInstance.destroy();
  }
  
  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: data.map(d => new Date(d.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })),
      datasets: [
        {
          label: 'BTC Price',
          data: data.map(d => d.price),
          borderColor: '#00aaff',
          backgroundColor: 'rgba(0, 170, 255, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        title: {
          display: true,
          text: '24-Hour Price History',
          color: '#e6edf3',
          font: {
            family: 'Courier New',
            size: 16,
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(15, 20, 25, 0.95)',
          titleColor: '#e6edf3',
          bodyColor: '#8b949e',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (context) => {
              const index = context[0].dataIndex;
              const timestamp = data[index].timestamp;
              return new Date(timestamp).toLocaleString();
            },
            label: (context) => {
              const value = context.parsed.y;
              if (value === null) return 'Price: N/A';
              return `Price: $${value.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Time',
            color: '#8b949e',
            font: {
              family: 'Courier New',
              size: 12
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#8b949e',
            font: {
              family: 'Courier New',
              size: 10
            },
            maxRotation: 0,
            autoSkip: true,
            autoSkipPadding: 20
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Price (USD)',
            color: '#8b949e',
            font: {
              family: 'Courier New',
              size: 12
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#8b949e',
            font: {
              family: 'Courier New',
              size: 11
            },
            callback: (value) => {
              return `$${(Number(value) / 1000).toFixed(1)}k`;
            }
          }
        }
      }
    }
  };
  
  priceChartInstance = new Chart(canvas, config);
  return priceChartInstance;
}

export function updatePriceHistoryChart(data: PricePoint[]): void {
  if (!priceChartInstance) return;
  
  priceChartInstance.data.labels = data.map(d => 
    new Date(d.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  );
  priceChartInstance.data.datasets[0].data = data.map(d => d.price);
  
  priceChartInstance.update('none');
}

export function addPricePoint(price: number, timestamp: number): void {
  if (!priceChartInstance) return;
  
  const timeLabel = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  priceChartInstance.data.labels?.push(timeLabel);
  priceChartInstance.data.datasets[0].data.push(price);
  
  // Keep only last 100 points (for performance)
  if (priceChartInstance.data.labels && priceChartInstance.data.labels.length > 100) {
    priceChartInstance.data.labels.shift();
    priceChartInstance.data.datasets[0].data.shift();
  }
  
  priceChartInstance.update('none');
}

/* ============================================
   CONFIDENCE GAUGE (SVG-based)
   ============================================ */

export function createConfidenceGauge(
  containerId: string,
  confidence: number
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container with id "${containerId}" not found`);
    return;
  }
  
  const percentage = Math.round(confidence * 100);
  
  // Color based on confidence
  const getColor = (conf: number): string => {
    if (conf >= 0.75) return '#00ff88'; // High confidence - green
    if (conf >= 0.55) return '#ffaa00'; // Medium confidence - yellow
    return '#ff4444'; // Low confidence - red
  };
  
  const color = getColor(confidence);
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (circumference * confidence);
  
  container.innerHTML = `
    <div class="confidence-gauge" style="text-align: center; padding: 20px;">
      <svg width="160" height="160" viewBox="0 0 120 120" style="display: block; margin: 0 auto;">
        <!-- Background circle -->
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          stroke-width="12"
        />
        
        <!-- Progress circle -->
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="${color}"
          stroke-width="12"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          stroke-linecap="round"
          transform="rotate(-90 60 60)"
          style="transition: stroke-dashoffset 0.8s ease, stroke 0.5s ease"
        />
        
        <!-- Center text -->
        <text
          x="60"
          y="68"
          text-anchor="middle"
          font-size="32"
          font-weight="bold"
          font-family="Courier New, monospace"
          fill="${color}"
          style="transition: fill 0.5s ease"
        >
          ${percentage}%
        </text>
      </svg>
      
      <div style="
        margin-top: 12px;
        font-size: 13px;
        color: #e6edf3;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-family: Courier New, monospace;
        font-weight: bold;
      ">
        Forecast Confidence
      </div>
      
      <div style="
        margin-top: 4px;
        font-size: 11px;
        color: ${color};
        font-family: Courier New, monospace;
      ">
        ${confidence >= 0.75 ? 'HIGH' : confidence >= 0.55 ? 'MEDIUM' : 'LOW'}
      </div>
    </div>
  `;
}

export function updateConfidenceGauge(
  containerId: string,
  confidence: number
): void {
  createConfidenceGauge(containerId, confidence);
}

/* ============================================
   CLEANUP
   ============================================ */

export function destroyAllCharts(): void {
  if (forecastChartInstance) {
    forecastChartInstance.destroy();
    forecastChartInstance = null;
  }
  
  if (priceChartInstance) {
    priceChartInstance.destroy();
    priceChartInstance = null;
  }
}
