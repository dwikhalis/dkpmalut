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
}

export default function BarCharts({
  labels,
  datasets,
  stacked,
  chartTitle,
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

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 16 } },
    plugins: {
      legend: { position: "bottom" },
      title: { display: true, text: chartTitle },
      datalabels: { display: false },
      // datalabels: {
      //   anchor: "end",
      //   align: "end",
      //   clamp: true,
      //   color: "#111",
      //   font: { weight: "normal", size: 12 },
      //   rotation: -90,
      //   formatter: (value: unknown) =>
      //     typeof value === "number" ? value.toLocaleString() : "",
      // },
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
      x: { stacked },
      y: {
        stacked,
        beginAtZero: true,
        ticks: {
          callback: (v) => {
            const num = typeof v === "number" ? v : Number(v);
            return `${nf.format(num)} Ton`;
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
