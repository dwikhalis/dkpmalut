"use client";

import { forwardRef } from "react";
import {
  ArcElement,
  Chart as ChartJS,
  type ChartOptions,
  Legend,
  Title,
  Tooltip,
} from "chart.js";
import { Pie } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import {
  DEFAULT_CHART_COLORS,
  formatChartValue,
  type BaseChartProps,
} from "./chartTypes";

ChartJS.register(ArcElement, Title, Tooltip, Legend, ChartDataLabels);

type PieChartProps = BaseChartProps & {
  heightClassName?: string;
  showLegend?: boolean;
};

const PieCharts = forwardRef<ChartJS<"pie"> | undefined, PieChartProps>(
  function PieCharts(
    {
      labels,
      datasets,
      chartTitle,
      tooltipLabels,
      datalabel = false,
      showLegend = true,
      unit,
      heightClassName = "h-[60vh]",
    },
    ref,
  ) {
    const firstDataset = datasets[0] ?? { label: "", values: [] };
    const data = {
      labels,
      datasets: [
        {
          label: firstDataset.label,
          data: firstDataset.values,
          backgroundColor: labels.map(
            (_, index) =>
              firstDataset.backgroundColors?.[index] ??
              DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length],
          ),
          borderColor: "#fff",
          borderWidth: 1,
        },
      ],
    };

    const total = firstDataset.values.reduce((sum, value) => sum + value, 0);

    const options: ChartOptions<"pie"> = {
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
              const value = Number(ctx.parsed ?? 0);
              const percentage =
                total > 0 ? ` (${((value / total) * 100).toFixed(1)}%)` : "";
              const label = ctx.label ? `${ctx.label}: ` : "";

              return `${label}${formatChartValue(value, unit)}${percentage}`;
            },
          },
        },
        datalabels: {
          display: datalabel,
          color: "#111",
          font: { weight: "normal", size: 11 },
          formatter: (value: unknown) => {
            const num = Number(value);

            if (!Number.isFinite(num) || total <= 0) {
              return formatChartValue(value, unit);
            }

            return `${((num / total) * 100).toFixed(1)}%`;
          },
        },
      },
    };

    return (
      <div
        className={`mb-6 w-full overflow-x-auto overflow-y-hidden ${heightClassName}`}
      >
        <div className="h-full">
          <Pie ref={ref} data={data} options={options} />
        </div>
      </div>
    );
  },
);

export default PieCharts;
