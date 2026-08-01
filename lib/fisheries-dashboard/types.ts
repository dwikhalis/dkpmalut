import type { DashboardTab, DashboardTemplateType } from "./config";

export type UploadStatus = "pending" | "invalid" | "valid" | "saved";
export type VisualizationStatus = "pending" | "editing" | "saved" | "dirty";
export type WorkflowStage = "selection" | "upload" | "visualization" | "publication";
export type PublicationStatus = null | "requested" | "approved" | "rejected";

export type DashboardWorkflow = {
  id: string;
  user_id: string;
  label: string;
  selected_tabs: DashboardTab[];
  current_stage: WorkflowStage;
  active_tab: DashboardTab | null;
  upload_status: Partial<Record<DashboardTab, UploadStatus>>;
  visualization_status: Partial<Record<DashboardTab, VisualizationStatus>>;
  publication_status: PublicationStatus;
  created_at: string;
  updated_at: string;
};

export type DashboardSourceUpload = {
  id: string;
  workflow_id: string;
  source_type: DashboardTemplateType;
  source_table: "dataset_fish_trip" | "dataset_fish_length";
  row_count: number;
  compatible_tabs: DashboardTab[];
  created_at: string;
};

export type DashboardWorkflowMetadata = {
  selectedTabs: DashboardTab[];
  currentStage: WorkflowStage;
  activeTab: DashboardTab | null;
  uploadStatus: Partial<Record<DashboardTab, UploadStatus>>;
  visualizationStatus: Partial<Record<DashboardTab, VisualizationStatus>>;
  sourcePartnerId?: string;
};

export type ValidationIssue = {
  row?: number;
  column?: string;
  value?: string;
  reason: string;
  suggestion?: string;
  severity: "error" | "warning";
};

export type ValidationResult = {
  tab: DashboardTab;
  destinationTable: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  ignoredEmptyRows: number;
  issues: ValidationIssue[];
  rows: Record<string, string | number | null>[];
  valid: boolean;
};

