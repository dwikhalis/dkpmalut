"use client";

import { forwardRef } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
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
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels,
);

type LineChartProps = BaseChartProps & {
  yAxis?: boolean;
  xAxisTitle?: string;
  showLegend?: boolean;
  rotateXLabels?: number;
  heightClassName?: string;
};

const LineCharts = forwardRef<ChartJS<"line"> | undefined, LineChartProps>(
  function LineCharts(
    {
      labels,
      datasets,
      chartTitle,
      tooltipLabels,
      datalabel = false,
      yAxis = true,
      xAxisTitle = "",
      showLegend = true,
      rotateXLabels = 0,
      unit,
      heightClassName = "h-[60vh]",
    },
    ref,
  ) {
    const data = {
      labels,
      datasets: datasets.map((dataset, index) => {
        const color =
          dataset.borderColor ??
          dataset.backgroundColor ??
          DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length];

        return {
          label: dataset.label,
          data: dataset.values,
          borderColor: color,
          backgroundColor: color,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.25,
        };
      }),
    };

    const options: ChartOptions<"line"> = {
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
              const label = ctx.dataset?.label ? `${ctx.dataset.label}: ` : "";

              return `${label}${formatChartValue(ctx.parsed.y, unit)}`;
            },
          },
        },
        datalabels: {
          display: datalabel,
          align: "top",
          color: "#111",
          font: { weight: "normal", size: 11 },
          formatter: (value: unknown) => formatChartValue(value, unit),
        },
      },
      scales: {
        x: {
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
          <Line ref={ref} data={data} options={options} />
        </div>
      </div>
    );
  },
);

export default LineCharts;
