import PublicDashboardWorkflow from "@/app/components/fisheries-dashboard/PublicDashboardWorkflow";

export const revalidate = 0;
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="mx-auto min-h-[70vh] w-full max-w-7xl p-6 md:p-10"><PublicDashboardWorkflow workflowId={id} /></main>;
}
