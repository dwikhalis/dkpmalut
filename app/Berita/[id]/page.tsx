import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import DummyContent from "@/public/dummyDatabase.json";
import { redirect } from "next/navigation";

interface Props {
  //! In Next 15, these APIs have been made asynchronous.
  //! You can read more about this in the Next.js 15 Upgrade Guide.
  //! https://nextjs.org/docs/messages/sync-dynamic-apis
  params: Promise<{ id: string }>;
}

export default async function page({ params }: Props) {
  const { id } = await params;
  const paramId = Number(id);

  const dbIds = DummyContent.map((e) => {
    return Number(e.id);
  });

  const found = dbIds.find((e: number) => e === paramId);

  if (!found) {
    redirect("/404");
  } else {
    return (
      <>
        <Navbar />
        <div className="flex flex-col gap-6 mx-12 my-12 p-12">
          <img src={DummyContent[paramId - 1].image} />
          <h6>{DummyContent[paramId - 1].tag}</h6>
          <h2>{DummyContent[paramId - 1].title}</h2>
          <h5 className="whitespace-pre-wrap">
            {DummyContent[paramId - 1].content}
          </h5>
          <h5 className="font-bold">
            Sumber : <span>{DummyContent[paramId - 1].redirect}</span>
          </h5>
        </div>
        <Footer />
      </>
    );
  }
}
