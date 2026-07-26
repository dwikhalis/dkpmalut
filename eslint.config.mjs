import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: ["Archived/**", ".next/**", "node_modules/**"],
  },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // These components contain intentionally dormant editor branches that are
  // retained for the next UI phase. Keep the exception narrowly file-scoped;
  // unused-code checks remain enabled everywhere else.
  {
    files: [
      "app/Stores/adminContentStore.ts",
      "app/components/ChartGeneric.tsx",
      "app/components/DataChart.tsx",
      "app/components/Dataset.tsx",
      "app/components/DatasetConfig.tsx",
      "app/components/Homepage/SectionGallery.tsx",
      "app/components/Homepage/SectionOrg.tsx",
      "app/components/Maps/MapDataset.tsx",
      "app/components/Maps/MapPreview.tsx",
      "app/components/Maps/MapPublic.tsx",
      "app/profile/page.tsx",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Existing effects deliberately synchronize URL/store state. Their setters
  // and loader functions are not stable dependencies and including them causes
  // repeated fetches. New files still receive exhaustive-deps checks.
  {
    files: [
      "app/components/Dashboard/DashAppCMS.tsx",
      "app/components/Dashboard/DashData.tsx",
      "app/components/Dashboard/DashNewsGalleryStaff.tsx",
      "app/components/DataPublishTable.tsx",
      "app/components/DatasetConfig.tsx",
      "app/components/DatasetTable.tsx",
      "app/components/MapKKD.tsx",
      "app/components/Maps/MapDataset.tsx",
      "app/components/Maps/MapPreview.tsx",
    ],
    rules: {
      "react-hooks/exhaustive-deps": "off",
    },
  },
  // Map previews use blob/data URLs, SVG symbols, and user-controlled asset
  // dimensions that cannot safely use the Next image optimizer.
  {
    files: [
      "app/components/Dataset.tsx",
      "app/components/Maps/MapDataset.tsx",
      "app/components/Maps/MapPublic.tsx",
      "app/components/Navbar.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
