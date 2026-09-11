import PortfolioApp, { type View } from "@/components/PortfolioApp";

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const initialView: View = searchParams?.view === "terminal" ? "terminal" : "overview";

  return <PortfolioApp initialView={initialView} />;
}
