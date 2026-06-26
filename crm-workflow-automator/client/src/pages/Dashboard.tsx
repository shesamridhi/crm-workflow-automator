import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import Overview from "./modules/Overview";
import CRMConnections from "./modules/CRMConnections";
import FieldMapper from "./modules/FieldMapper";
import WorkflowBuilder from "./modules/WorkflowBuilder";
import DataMigration from "./modules/DataMigration";
import ActivityLog from "./modules/ActivityLog";

type ModuleType =
  | "overview"
  | "connections"
  | "field-mapper"
  | "workflow"
  | "migration"
  | "activity";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [activeModule, setActiveModule] = useState<ModuleType>("overview");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Please log in to access the dashboard.</p>
      </div>
    );
  }

  const navigationItems = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "connections", label: "CRM Connections", icon: "🔗" },
    { id: "field-mapper", label: "Field Mapper", icon: "🗺️" },
    { id: "workflow", label: "Workflow Builder", icon: "⚙️" },
    { id: "migration", label: "Data Migration", icon: "📤" },
    { id: "activity", label: "Activity Log", icon: "📋" },
  ];

  const renderModule = () => {
    switch (activeModule) {
      case "overview":
        return <Overview />;
      case "connections":
        return <CRMConnections />;
      case "field-mapper":
        return <FieldMapper />;
      case "workflow":
        return <WorkflowBuilder />;
      case "migration":
        return <DataMigration />;
      case "activity":
        return <ActivityLog />;
      default:
        return <Overview />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Module Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-border">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id as ModuleType)}
              className={`px-4 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeModule === item.id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Module Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            {navigationItems.find((item) => item.id === activeModule)?.label}
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage your CRM integration and data synchronization
          </p>
        </div>

        {/* Module Content */}
        <div>{renderModule()}</div>
      </div>
    </DashboardLayout>
  );
}
