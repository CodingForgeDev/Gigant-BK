require("dotenv").config();
const mongoose = require("mongoose");
const RoadmapItem = require("../models/RoadmapItem");

const items = [
  { ticketNumber: "GH-001", title: "Super Admin auth (login / JWT / session)", status: "done", priority: "critical", phase: "Phase 1", order: 1 },
  { ticketNumber: "GH-002", title: "MongoDB models (Admin, ActivityLog)", status: "done", priority: "critical", phase: "Phase 1", order: 2 },
  { ticketNumber: "GH-003", title: "Backend API (Express + Octokit)", status: "done", priority: "critical", phase: "Phase 1", order: 3 },
  { ticketNumber: "GH-004", title: "Rsbuild React frontend scaffold", status: "done", priority: "high", phase: "Phase 1", order: 4 },
  { ticketNumber: "GH-005", title: "Dark-themed GitHub-style UI", status: "done", priority: "medium", phase: "Phase 1", order: 5 },
  { ticketNumber: "GH-006", title: "Dashboard — list owned repos", status: "done", priority: "high", phase: "Phase 1", order: 6 },
  { ticketNumber: "GH-007", title: "List all collaborators across repos", status: "done", priority: "critical", phase: "Phase 2", order: 7 },
  { ticketNumber: "GH-008", title: "Search / filter collaborators", status: "done", priority: "high", phase: "Phase 2", order: 8 },
  { ticketNumber: "GH-009", title: "View pending invitations per repo", status: "done", priority: "high", phase: "Phase 2", order: 9 },
  { ticketNumber: "GH-010", title: "Remove collaborator from a single repo", status: "done", priority: "critical", phase: "Phase 2", order: 10 },
  { ticketNumber: "GH-011", title: "Bulk remove collaborator from all repos", status: "done", priority: "high", phase: "Phase 2", order: 11 },
  { ticketNumber: "GH-012", title: "Activity logging for every action", status: "done", priority: "high", phase: "Phase 2", order: 12 },
  { ticketNumber: "GH-013", title: "Settings page — update name / GitHub token", status: "done", priority: "medium", phase: "Phase 2", order: 13 },
  { ticketNumber: "GH-014", title: "Repo detail page — collaborators + invitations", status: "done", priority: "high", phase: "Phase 3", order: 14 },
  { ticketNumber: "GH-015", title: "Confirmation modal for destructive actions", status: "done", priority: "medium", phase: "Phase 3", order: 15 },
  { ticketNumber: "GH-016", title: "Responsive sidebar (mobile collapse)", status: "done", priority: "medium", phase: "Phase 3", order: 16 },
  { ticketNumber: "GH-017", title: "Revoke pending invitations", status: "done", priority: "high", phase: "Phase 3", order: 17 },
  { ticketNumber: "GH-018", title: "Add new collaborators to repos", status: "done", priority: "high", phase: "Phase 3", order: 18 },
  { ticketNumber: "GH-019", title: "Batch operations — select multiple users", status: "done", priority: "high", phase: "Phase 3", order: 19 },
  { ticketNumber: "GH-020", title: "Pagination for activity log", status: "done", priority: "medium", phase: "Phase 4", order: 20 },
  { ticketNumber: "GH-021", title: "Rate-limit display in sidebar", status: "done", priority: "medium", phase: "Phase 4", order: 21 },
  { ticketNumber: "GH-022", title: "Export activity log as CSV", status: "done", priority: "medium", phase: "Phase 4", order: 22 },
  { ticketNumber: "GH-023", title: "Multi-admin support", status: "done", priority: "high", phase: "Phase 4", order: 23 },
  { ticketNumber: "GH-024", title: "Role-based nav", status: "done", priority: "high", phase: "Phase 4", order: 24 },
  { ticketNumber: "GH-025", title: "Overview dashboard with key metrics", status: "done", priority: "high", phase: "Phase 5", order: 25 },
  { ticketNumber: "GH-026", title: "Kanban roadmap with full CRUD", status: "done", priority: "high", phase: "Phase 5", order: 26 },
  { ticketNumber: "GH-027", title: "Subscription plans management", status: "done", priority: "high", phase: "Phase 5", order: 27 },
  { ticketNumber: "GH-028", title: "Contact form messages inbox", status: "done", priority: "medium", phase: "Phase 5", order: 28 },
  { ticketNumber: "GH-029", title: "Third-party integrations management", status: "done", priority: "medium", phase: "Phase 5", order: 29 },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  for (const item of items) {
    await RoadmapItem.findOneAndUpdate(
      { ticketNumber: item.ticketNumber },
      item,
      { upsert: true, new: true }
    );
  }

  console.log(`Seeded ${items.length} roadmap items`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
