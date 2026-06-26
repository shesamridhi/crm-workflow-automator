import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function Overview() {
  const [stats, setStats] = useState({
    connectedCRMs: 0,
    activeMappings: 0,
    activeWorkflows: 0,
    recentSyncs: 0,
  });

  const connectionsQuery = trpc.crm.getConnections.useQuery();
  const mappingsQuery = trpc.fieldMapper.getMappings.useQuery();
  const workflowsQuery = trpc.workflow.getRules.useQuery();
  const syncHistoryQuery = trpc.sync.getHistory.useQuery({ limit: 10 });

  useEffect(() => {
    if (connectionsQuery.data && mappingsQuery.data && workflowsQuery.data) {
      setStats({
        connectedCRMs: connectionsQuery.data.filter((c) => c.isConnected).length,
        activeMappings: mappingsQuery.data.filter((m) => m.isActive).length,
        activeWorkflows: workflowsQuery.data.filter((w) => w.isActive).length,
        recentSyncs: syncHistoryQuery.data?.length || 0,
      });
    }
  }, [connectionsQuery.data, mappingsQuery.data, workflowsQuery.data, syncHistoryQuery.data]);

  const statCards = [
    {
      label: "Connected CRMs",
      value: stats.connectedCRMs,
      icon: "🔗",
      color: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Active Field Mappings",
      value: stats.activeMappings,
      icon: "🗺️",
      color: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      label: "Active Workflows",
      value: stats.activeWorkflows,
      icon: "⚙️",
      color: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "Recent Syncs",
      value: stats.recentSyncs,
      icon: "📊",
      color: "bg-orange-50 dark:bg-orange-900/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <Card key={idx} className={`p-6 ${card.color} border-0`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted mb-2">{card.label}</p>
                <p className="text-3xl font-bold text-foreground">{card.value}</p>
              </div>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🔗</div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Connect CRM</h3>
                <p className="text-sm text-muted">Set up HubSpot or Salesforce</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🗺️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Create Field Mapping</h3>
                <p className="text-sm text-muted">Map fields between systems</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="text-3xl">⚙️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Build Workflow</h3>
                <p className="text-sm text-muted">Create IF/THEN automation rules</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="text-3xl">📤</div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Migrate Data</h3>
                <p className="text-sm text-muted">Upload and transform CSV files</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🔄</div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Execute Sync</h3>
                <p className="text-sm text-muted">Sync data between systems</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="text-3xl">📋</div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">View Activity</h3>
                <p className="text-sm text-muted">Monitor all operations</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Activity Preview */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
        <Card className="p-6">
          {syncHistoryQuery.data && syncHistoryQuery.data.length > 0 ? (
            <div className="space-y-3">
              {syncHistoryQuery.data.slice(0, 5).map((sync, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground">
                      {sync.sourceSystem} → {sync.targetSystem}
                    </p>
                    <p className="text-sm text-muted">{sync.entityType}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        sync.status === "success"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                          : sync.status === "failed"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
                      }`}
                    >
                      {sync.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted py-8">No recent activity. Start by connecting a CRM!</p>
          )}
        </Card>
      </div>

      {/* Getting Started Guide */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Getting Started</h2>
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-0">
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Follow these steps to get started:</h3>
            <ol className="space-y-2 text-sm text-foreground">
              <li className="flex gap-3">
                <span className="font-bold text-accent">1.</span>
                <span>Connect your HubSpot and/or Salesforce accounts using OAuth 2.0</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent">2.</span>
                <span>Create field mappings to define how data transforms between systems</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent">3.</span>
                <span>Build workflows with IF/THEN rules for automated synchronization</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent">4.</span>
                <span>Upload CSV files for bulk data migration with automatic deduplication</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent">5.</span>
                <span>Monitor all operations in the Activity Log for complete audit trail</span>
              </li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}
