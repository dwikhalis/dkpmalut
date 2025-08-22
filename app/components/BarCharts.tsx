"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface Dataset {
  label: string;
  values: number[];
  backgroundColor?: string;
}

interface BarChartProps {
  labels: string[];
  datasets: Dataset[];
  stacked: boolean;
  chartTitle: string;
  tooltipLabels?: string[];
  datalabel?: boolean;
  yAxis?: boolean;
  rotateXLabels?: number;
}

export default function BarCharts({
  labels,
  datasets,
  stacked,
  chartTitle,
  tooltipLabels,
  datalabel = false,
  yAxis = true,
  rotateXLabels = 0,
}: BarChartProps) {
  const data = {
    labels,
    datasets: datasets.map((d) => ({
      label: d.label,
      data: d.values,
      backgroundColor: d.backgroundColor ?? "rgba(53, 162, 235, 0.5)",
    })),
  };

  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

  let showTitle = true;

  if (chartTitle === "") {
    showTitle = false;
  }

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 16 } },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: {
            size: 10,
          },
        },
      },
      title: { display: showTitle, text: chartTitle },
      tooltip: {
        callbacks: {
          title: (items) => {
            const idx = items?.[0]?.dataIndex ?? 0;
            return tooltipLabels?.[idx] ?? items?.[0]?.label ?? "";
          },
          // Keep the dataset + formatted value on second line
          label: (ctx) => {
            const v = ctx.parsed?.y ?? ctx.parsed ?? 0;
            const ds = ctx.dataset?.label ? `${ctx.dataset.label}: ` : "";
            return `${ds}${nf.format(v)} kg`;
          },
        },
      },
      datalabels: {
        display: datalabel,
        anchor: "end",
        align: "end",
        clamp: true,
        color: "#111",
        font: { weight: "normal", size: 12 },
        rotation: -90,
        formatter: (value: unknown) =>
          typeof value === "number" ? value.toLocaleString() : "",
      },
    },

    datasets: {
      bar: {
        //! To force bar width
        // barThickness: barWidth,
        // maxBarThickness: barWidth,
        //! To set bar width and its gap based on the field given
        categoryPercentage: 0.9,
        barPercentage: 0.9,

        //! Rounded bar
        borderRadius: 3,
      },
    },

    scales: {
      // ! Creating Stacked Bar or Not
      x: {
        stacked,
        ticks: {
          minRotation: rotateXLabels,
          maxRotation: rotateXLabels,
          font: {
            size: 10,
          },
        },
      },
      y: {
        display: yAxis,
        stacked,
        beginAtZero: true,
        ticks: {
          font: {
            size: 10,
          },
          callback: (v) => {
            const num = typeof v === "number" ? v : Number(v);

            if (num >= 1000000000) {
              return `${nf.format(num / 1000000000)}B kg`;
            } else if (num >= 1000000) {
              return `${nf.format(num / 1000000)}M kg`;
            } else if (num >= 1000) {
              return `${nf.format(num / 1000)}K kg`;
            } else {
              return `${nf.format(num)} kg`;
            }
          },
        },
      },
    },
  };

  return (
    <div className="w-full h-[60vh] mb-6 overflow-x-auto overflow-y-hidden">
      <div className="h-full">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
