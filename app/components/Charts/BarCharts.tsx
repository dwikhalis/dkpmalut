"use client";

import { forwardRef } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import {
  DEFAULT_CHART_COLORS,
  formatAxisValue,
  formatChartValue,
  type BaseChartProps,
} from "./chartTypes";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels,
);

type BarChartProps = BaseChartProps & {
  stacked: boolean;
  yAxis?: boolean;
  xAxisTitle?: string;
  showLegend?: boolean;
  histogram?: boolean;
  rotateXLabels?: number;
  heightClassName?: string;
};

const BarCharts = forwardRef<ChartJS<"bar"> | undefined, BarChartProps>(
  function BarCharts(
    {
      labels,
      datasets,
      stacked,
      chartTitle,
      tooltipLabels,
      datalabel = false,
      yAxis = true,
      xAxisTitle = "",
      showLegend = true,
      histogram = false,
      rotateXLabels = 0,
      unit,
      heightClassName = "h-[60vh]",
    },
    ref,
  ) {
    const data = {
      labels,
      datasets: datasets.map((dataset, index) => ({
        label: dataset.label,
        data: dataset.values,
        backgroundColor:
          dataset.backgroundColor ??
          DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length],
      })),
    };

    const options: ChartOptions<"bar"> = {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 16 } },
      plugins: {
        legend: {
          display: showLegend,
          position: "bottom",
          labels: { font: { size: 10 } },
        },
        title: { display: chartTitle !== "", text: chartTitle },
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = items?.[0]?.dataIndex ?? 0;
              return tooltipLabels?.[idx] ?? items?.[0]?.label ?? "";
            },
            label: (ctx) => {
              const value = ctx.parsed?.y ?? ctx.parsed ?? 0;
              const label = ctx.dataset?.label ? `${ctx.dataset.label}: ` : "";

              return `${label}${formatChartValue(value, unit)}`;
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
          formatter: (value: unknown) => formatChartValue(value, unit),
        },
      },
      datasets: {
        bar: {
          categoryPercentage: histogram ? 1 : 0.9,
          barPercentage: histogram ? 1 : 0.9,
          borderRadius: histogram ? 0 : 3,
        },
      },
      scales: {
        x: {
          stacked,
          title: {
            display: Boolean(xAxisTitle),
            text: xAxisTitle,
          },
          ticks: {
            minRotation: rotateXLabels,
            maxRotation: rotateXLabels,
            font: { size: 10 },
          },
        },
        y: {
          display: yAxis,
          stacked,
          beginAtZero: true,
          ticks: {
            font: { size: 10 },
            callback: (value) => formatAxisValue(value, unit),
          },
        },
      },
    };

    return (
      <div
        className={`mb-6 w-full overflow-x-auto overflow-y-hidden ${heightClassName}`}
      >
        <div className="h-full">
          <Bar ref={ref} data={data} options={options} />
        </div>
      </div>
    );
  },
);

export default BarCharts;
