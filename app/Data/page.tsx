//! Force page to load fresh data each render
export const revalidate = 0;

import React from "react";
import ProductionChartWithFilters from "../components/ProductionChartWithFilters";

export default function Page() {
  return (
    <section className="lg:mr-24 md:mr-12 mr-8">
      <ProductionChartWithFilters />
    </section>
  );
}
