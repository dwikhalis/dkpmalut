import { notFound } from "next/navigation";
import LBIDashboard from "@/app/components/lbi/LBIDashboard";
import { supabase } from "@/lib/supabase/supabaseClient";
import type { LBIObservation } from "@/lib/fisheries/lbiTypes";

export const revalidate = 300;

export default async function PublicLBIPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: dataset, error } = await supabase
    .from("lbi_datasets")
    .select("id,dataset_name,sampling_location,landing_site,fishing_gear,sampling_start_date,sampling_end_date,length_unit,published,reference_snapshot")
    .eq("slug", slug).eq("published", "approved").maybeSingle();
  if (error || !dataset) notFound();
  const { data: rows, error: rowsError } = await supabase
    .from("lbi_observations")
    .select("sample_id,sampling_date,length,sex,weight,maturity_stage,notes,source_row_number")
    .eq("lbi_dataset_id", dataset.id).order("sampling_date");
  if (rowsError) notFound();
  const observations: LBIObservation[] = (rows ?? []).map((row) => ({
    sampleId: row.sample_id, samplingDate: row.sampling_date, length: Number(row.length),
    sex: row.sex, weight: row.weight == null ? undefined : Number(row.weight),
    maturityStage: row.maturity_stage ?? undefined, notes: row.notes ?? undefined,
    sourceRowNumber: row.source_row_number,
  }));
  return <main className="mx-auto max-w-7xl px-4 py-10"><LBIDashboard dataset={dataset as Parameters<typeof LBIDashboard>[0]["dataset"]} observations={observations} /></main>;
}

