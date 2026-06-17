// Shared status groups used by the sidebar Project Selector and the
// Accountant dashboard. Update this list to update both places at once.
export const PROJECT_STATUS_GROUPS = [
  { status: "In Design",          color: "bg-yellow-100 text-yellow-800" },
  { status: "Permitting",         color: "bg-blue-100 text-blue-800" },
  { status: "Under Construction", color: "bg-orange-100 text-orange-800" },
  { status: "Completed",          color: "bg-green-100 text-green-800" },
  { status: "Permanently Closed", color: "bg-gray-100 text-gray-600" },
] as const;

export type ProjectStatusGroup = typeof PROJECT_STATUS_GROUPS[number];
