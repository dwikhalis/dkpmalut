"use client";

import { useMemo, useState } from "react";
import Button from "@/app/components/Button";
import { mergeAnalysisRequirements } from "@/lib/fisheries/analysisRequirements";
import {
  buildCaptureTemplates,
  type CaptureTemplateSettings,
} from "@/lib/fisheries/captureTemplates";
import type {
  DashboardConfiguration,
  FisheriesAnalysisType,
} from "@/lib/fisheries/dashboardOrchestration";

const CPUE_OPTIONS = [
  ["kg_per_trip", "Kg per trip"],
  ["individuals_per_trip", "Individu per trip"],
  ["kg_per_hour", "Kg per jam penangkapan"],
  ["kg_per_setting", "Kg per setting"],
  ["kg_per_100_hooks", "Kg per 100 mata pancing"],
  ["kg_per_100m_net", "Kg per 100 meter jaring"],
] as const;
const COMPOSITION_OPTIONS = [
  ["weight", "Berat"],
  ["individuals", "Jumlah individu"],
  ["trips", "Frekuensi trip"],
] as const;

function download(filename: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function FisheriesRequirementsPanel({
  analyses,
  initialSettings,
  onSave,
}: {
  analyses: FisheriesAnalysisType[];
  initialSettings?: DashboardConfiguration["requirementSettings"];
  onSave: (settings: CaptureTemplateSettings) => Promise<void>;
}) {
  const [settings, setSettings] = useState<CaptureTemplateSettings>({
    cpueMethods: (initialSettings?.cpueMethods ??
      (analyses.includes("cpue")
        ? ["kg_per_trip"]
        : [])) as CaptureTemplateSettings["cpueMethods"],
    compositionBases: (initialSettings?.compositionBases ??
      (analyses.includes("catch-composition")
        ? ["weight"]
        : [])) as CaptureTemplateSettings["compositionBases"],
    lbiMeasurementType:
      initialSettings?.lbiMeasurementType ??
      (analyses.includes("lbi") ? "total_length" : undefined),
  });
  const [saving, setSaving] = useState(false);
  const requirements = useMemo(
    () => mergeAnalysisRequirements(analyses),
    [analyses],
  );
  const templates = useMemo(
    () => buildCaptureTemplates(analyses, settings),
    [analyses, settings],
  );
  const toggle = <T extends string>(values: T[], value: T) =>
    values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];

  return (
    <section className="mt-5 rounded-xl border border-stone-200 p-4">
      <h2 className="font-semibold">Kebutuhan data</h2>
      <p className="mt-1 text-sm text-stone-600">
        Kolom digabungkan dari seluruh analisis dan tidak diduplikasi.
      </p>
      {analyses.includes("cpue") && (
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold">Metode CPUE</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {CPUE_OPTIONS.map(([value, label]) => (
              <label key={value} className="text-sm">
                <input
                  type="checkbox"
                  checked={settings.cpueMethods.includes(value)}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      cpueMethods: toggle(settings.cpueMethods, value),
                    })
                  }
                  className="mr-2 accent-sky-800"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {analyses.includes("catch-composition") && (
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold">Basis komposisi</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {COMPOSITION_OPTIONS.map(([value, label]) => (
              <label key={value} className="text-sm">
                <input
                  type="checkbox"
                  checked={settings.compositionBases.includes(value)}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      compositionBases: toggle(
                        settings.compositionBases,
                        value,
                      ),
                    })
                  }
                  className="mr-2 accent-sky-800"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {analyses.includes("lbi") && (
        <label className="mt-4 block max-w-xs text-sm font-semibold">
          Tipe pengukuran LBI
          <select
            value={settings.lbiMeasurementType}
            onChange={(event) =>
              setSettings({
                ...settings,
                lbiMeasurementType: event.target.value as
                  | "total_length"
                  | "fork_length",
              })
            }
            className="mt-1 w-full rounded-md border px-3 py-2"
          >
            <option value="total_length">Total Length (TL)</option>
            <option value="fork_length">Fork Length (FL)</option>
          </select>
        </label>
      )}
      <div className="mt-4 max-h-64 overflow-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-sky-100">
            <tr>
              <th className="p-2 text-left">Field</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Diperlukan oleh</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((item) => (
              <tr key={item.key} className="border-t">
                <td className="p-2">{item.label}</td>
                <td className="p-2">{item.requirement}</td>
                <td className="p-2">{item.requiredBy.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {templates.map((template) => (
          <Button
            key={template.role}
            variant="outline"
            onClick={() => download(template.filename, template.csv)}
          >
            Unduh {template.filename}
          </Button>
        ))}
        <Button
          loading={saving}
          onClick={async () => {
            setSaving(true);
            await onSave(settings);
            setSaving(false);
          }}
        >
          Simpan kebutuhan
        </Button>
      </div>
    </section>
  );
}
