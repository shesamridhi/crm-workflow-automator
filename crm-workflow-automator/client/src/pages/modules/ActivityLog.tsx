import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

export default function ActivityLog() {
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const activityQuery = trpc.activity.getLog.useQuery({ limit: 100 });

  const activityTypes = [
    { value: "all", label: "All Activities" },
    { value: "oauth_connect", label: "OAuth Connect" },
    { value: "oauth_disconnect", label: "OAuth Disconnect" },
    { value: "field_mapping_created", label: "Field Mapping Created" },
    { value: "field_mapping_updated", label: "Field Mapping Updated" },
    { value: "field_mapping_deleted", label: "Field Mapping Deleted" },
    { value: "workflow_created", label: "Workflow Created" },
    { value: "workflow_updated", label: "Workflow Updated" },
    { value: "workflow_deleted", label: "Workflow Deleted" },
    { value: "workflow_triggered", label: "Workflow Triggered" },
    { value: "sync_started", label: "Sync Started" },
    { value: "sync_completed", label: "Sync Completed" },
    { value: "sync_failed", label: "Sync Failed" },
    { value: "csv_upload", label: "CSV Upload" },
    { value: "data_migration", label: "Data Migration" },
    { value: "webhook_received", label: "Webhook Received" },
    { value: "webhook_processed", label: "Webhook Processed" },
    { value: "webhook_failed", label: "Webhook Failed" },
  ];

  const getActivityIcon = (type: string): string => {
    const icons: Record<string, string> = {
      oauth_connect: "🔗",
      oauth_disconnect: "🔓",
      field_mapping_created: "🗺️",
      field_mapping_updated: "✏️",
      field_mapping_deleted: "🗑️",
      workflow_created: "⚙️",
      workflow_updated: "🔧",
      workflow_deleted: "❌",
      workflow_triggered: "⚡",
      sync_started: "▶️",
      sync_completed: "✅",
      sync_failed: "❌",
      csv_upload: "📤",
      data_migration: "📊",
      webhook_received: "📨",
      webhook_processed: "✔️",
      webhook_failed: "⚠️",
    };
    return icons[type] || "📝";
  };

  const getStatusColor = (status?: number): string => {
    if (!status) return "text-muted";
    if (status >= 200 && status < 300) return "text-green-600 dark:text-green-400";
    if (status >= 400 && status < 500) return "text-yellow-600 dark:text-yellow-400";
    if (status >= 500) return "text-red-600 dark:text-red-400";
    return "text-muted";
  };

  const filteredActivities =
    filterType === "all"
      ? activityQuery.data
      : activityQuery.data?.filter((a) => a.activityType === filterType);

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium text-foreground">Filter by Activity Type</label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activityTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted">
          {filteredActivities?.length || 0} activities
        </div>
      </div>

      {/* Activity Timeline */}
      {filteredActivities && filteredActivities.length > 0 ? (
        <div className="space-y-3">
          {filteredActivities.map((activity, idx) => (
            <Card
              key={activity.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setExpandedId(expandedId === activity.id ? null : activity.id)}
            >
              {/* Activity Header */}
              <div className="flex items-start gap-4">
                <div className="text-2xl mt-1">{getActivityIcon(activity.activityType)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground capitalize">
                      {activity.activityType.replace(/_/g, " ")}
                    </h3>
                    {activity.httpStatus && (
                      <span className={`text-xs font-mono font-bold ${getStatusColor(activity.httpStatus)}`}>
                        {activity.httpStatus}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted mb-2">{activity.description}</p>

                  <div className="flex items-center gap-4 text-xs text-muted">
                    {activity.endpoint && (
                      <span className="font-mono bg-muted/10 px-2 py-1 rounded">
                        {activity.httpMethod} {activity.endpoint}
                      </span>
                    )}
                    <span>{new Date(activity.createdAt).toLocaleString()}</span>
                    {activity.executionTime && (
                      <span>{activity.executionTime}ms</span>
                    )}
                  </div>
                </div>

                <div className="text-muted text-xl">
                  {expandedId === activity.id ? "▼" : "▶"}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === activity.id && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  {/* Resource Info */}
                  {activity.resourceType && (
                    <div>
                      <p className="text-xs font-medium text-muted mb-1">Resource</p>
                      <p className="text-sm font-mono bg-muted/10 px-2 py-1 rounded">
                        {activity.resourceType}: {activity.resourceId}
                      </p>
                    </div>
                  )}

                  {/* Request Payload */}
                  {activity.requestPayload && (
                    <div>
                      <p className="text-xs font-medium text-muted mb-1">Request Payload</p>
                      <pre className="text-xs bg-muted/10 p-2 rounded overflow-auto max-h-32 font-mono">
                        {JSON.stringify(
                          typeof activity.requestPayload === "string"
                            ? JSON.parse(activity.requestPayload)
                            : activity.requestPayload,
                          null,
                          2
                        ).substring(0, 500)}
                      </pre>
                    </div>
                  )}

                  {/* Response Payload */}
                  {activity.responsePayload && (
                    <div>
                      <p className="text-xs font-medium text-muted mb-1">Response Payload</p>
                      <pre className="text-xs bg-muted/10 p-2 rounded overflow-auto max-h-32 font-mono">
                        {JSON.stringify(
                          typeof activity.responsePayload === "string"
                            ? JSON.parse(activity.responsePayload)
                            : activity.responsePayload,
                          null,
                          2
                        ).substring(0, 500)}
                      </pre>
                    </div>
                  )}

                  {/* Error Details */}
                  {activity.errorDetails && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                      <p className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">
                        Error
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300 font-mono">
                        {activity.errorDetails}
                      </p>
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {activity.ipAddress && (
                      <div>
                        <p className="text-muted">IP Address</p>
                        <p className="font-mono text-foreground">{activity.ipAddress}</p>
                      </div>
                    )}
                    {activity.userAgent && (
                      <div>
                        <p className="text-muted">User Agent</p>
                        <p className="font-mono text-foreground truncate">{activity.userAgent}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted">No activities found</p>
        </Card>
      )}

      {/* Activity Statistics */}
      {activityQuery.data && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-0">
          <h3 className="font-semibold text-foreground mb-4">Activity Summary</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted">Total Activities</p>
              <p className="text-2xl font-bold text-foreground">{activityQuery.data.length}</p>
            </div>

            <div>
              <p className="text-xs text-muted">Successful</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {activityQuery.data.filter((a) => a.httpStatus && a.httpStatus < 400).length}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {activityQuery.data.filter((a) => a.httpStatus && a.httpStatus >= 400 && a.httpStatus < 500).length}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted">Errors</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {activityQuery.data.filter((a) => a.httpStatus && a.httpStatus >= 500).length}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
