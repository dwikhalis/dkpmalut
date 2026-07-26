import AppCmsComponentPreview from "../components/Dashboard/AppCmsComponentPreview";

export default async function AppCmsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ component?: string }>;
}) {
  const { component = "" } = await searchParams;

  return (
    <main className="min-h-dvh bg-transparent">
      <style>{`[data-app-shell] { display: none !important; }`}</style>
      <AppCmsComponentPreview component={component} />
    </main>
  );
}
