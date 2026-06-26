import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function WorkflowBuilder() {
  const [showDialog, setShowDialog] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("contact_created_hubspot");
  const [triggerField, setTriggerField] = useState("status");
  const [triggerOperator, setTriggerOperator] = useState("equals");
  const [triggerValue, setTriggerValue] = useState("");
  const [action, setAction] = useState("sync_to_salesforce");
  const [showTriggerTest, setShowTriggerTest] = useState(false);
  const [testPayload, setTestPayload] = useState("");

  const rulesQuery = trpc.workflow.getRules.useQuery();
  const createRuleMutation = trpc.workflow.createRule.useMutation();
  const deleteRuleMutation = trpc.workflow.deleteRule.useMutation();
  const simulateTriggerMutation = trpc.workflow.simulateTrigger.useMutation();

  const triggerEvents = [
    { value: "contact_created_hubspot", label: "Contact Created in HubSpot" },
    { value: "contact_updated_hubspot", label: "Contact Updated in HubSpot" },
    { value: "deal_created_hubspot", label: "Deal Created in HubSpot" },
    { value: "lead_created_salesforce", label: "Lead Created in Salesforce" },
    { value: "opportunity_created_salesforce", label: "Opportunity Created in Salesforce" },
  ];

  const operators = [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Not Equals" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does Not Contain" },
    { value: "exists", label: "Exists" },
    { value: "not_exists", label: "Does Not Exist" },
  ];

  const actions = [
    { value: "sync_to_salesforce", label: "Sync to Salesforce" },
    { value: "sync_to_hubspot", label: "Sync to HubSpot" },
    { value: "create_contact", label: "Create Contact" },
    { value: "update_contact", label: "Update Contact" },
    { value: "notify_user", label: "Notify User" },
  ];

  const handleCreateRule = async () => {
    if (!ruleName || !triggerEvent || !action) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createRuleMutation.mutateAsync({
        ruleName,
        description,
        triggerEvent,
        triggerCondition: {
          field: triggerField,
          operator: triggerOperator,
          value: triggerValue,
        },
        action,
      });

      toast.success("Workflow rule created successfully!");
      setShowDialog(false);
      setRuleName("");
      setDescription("");
      setTriggerField("status");
      setTriggerOperator("equals");
      setTriggerValue("");
      rulesQuery.refetch();
    } catch (error) {
      toast.error("Failed to create workflow rule");
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    try {
      await deleteRuleMutation.mutateAsync({ ruleId });
      toast.success("Workflow rule deleted");
      rulesQuery.refetch();
    } catch (error) {
      toast.error("Failed to delete workflow rule");
    }
  };

  const handleSimulateTrigger = async () => {
    try {
      let payload: Record<string, any> = {};

      if (testPayload) {
        try {
          payload = JSON.parse(testPayload);
        } catch {
          toast.error("Invalid JSON payload");
          return;
        }
      } else {
        // Generate default payload
        payload = {
          [triggerField]: triggerValue || "test_value",
          entityType: "contact",
          entityId: `test_${Date.now()}`,
        };
      }

      const results = await simulateTriggerMutation.mutateAsync({
        eventType: triggerEvent,
        payload,
      });

      const successCount = results.filter((r) => r.success).length;
      toast.success(`Trigger executed! ${successCount} rule(s) matched.`);
    } catch (error) {
      toast.error("Failed to simulate trigger");
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Workflow Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowDialog(true)}>+ Create New Workflow</Button>
      </div>

      {/* Existing Workflows */}
      {rulesQuery.data && rulesQuery.data.length > 0 ? (
        <div className="space-y-4">
          {rulesQuery.data.map((rule) => {
            const triggerEventLabel = triggerEvents.find((e) => e.value === rule.triggerEvent)?.label;
            const actionLabel = actions.find((a) => a.value === rule.action)?.label;

            return (
              <Card key={rule.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{rule.ruleName}</h3>
                    {rule.description && (
                      <p className="text-sm text-muted mt-1">{rule.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        rule.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200"
                      }`}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Rule Details */}
                <div className="space-y-3 bg-muted/5 p-4 rounded">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted">Trigger</p>
                      <p className="font-medium text-foreground">{triggerEventLabel}</p>
                    </div>
                    <div>
                      <p className="text-muted">Action</p>
                      <p className="font-medium text-foreground">{actionLabel}</p>
                    </div>
                  </div>

                  <div className="text-sm">
                    <p className="text-muted">Condition</p>
                    <p className="font-medium text-foreground">
                      {(rule.triggerCondition as any)?.field} {(rule.triggerCondition as any)?.operator}{" "}
                      {(rule.triggerCondition as any)?.value}
                    </p>
                  </div>

                  <div className="text-xs text-muted pt-2 border-t border-border">
                    Executed {rule.executionCount} time(s)
                    {rule.lastExecutedAt && (
                      <span>
                        • Last: {new Date(rule.lastExecutedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted mb-4">No workflows yet</p>
          <Button onClick={() => setShowDialog(true)}>Create Your First Workflow</Button>
        </Card>
      )}

      {/* Create Workflow Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Workflow Rule</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Rule Name */}
            <div>
              <label className="text-sm font-medium text-foreground">Rule Name</label>
              <Input
                placeholder="e.g., Sync HubSpot Contacts to Salesforce"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-foreground">Description (Optional)</label>
              <Input
                placeholder="Describe what this workflow does"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* IF Condition */}
            <div className="border-t border-border pt-4">
              <h3 className="font-medium text-foreground mb-3">IF Condition</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted">Trigger Event</label>
                  <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerEvents.map((event) => (
                        <SelectItem key={event.value} value={event.value}>
                          {event.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-muted">Field</label>
                    <Input
                      placeholder="e.g., status"
                      value={triggerField}
                      onChange={(e) => setTriggerField(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted">Operator</label>
                    <Select value={triggerOperator} onValueChange={setTriggerOperator}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-muted">Value</label>
                    <Input
                      placeholder="e.g., active"
                      value={triggerValue}
                      onChange={(e) => setTriggerValue(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* THEN Action */}
            <div className="border-t border-border pt-4">
              <h3 className="font-medium text-foreground mb-3">THEN Action</h3>

              <div>
                <label className="text-sm text-muted">Action to Execute</label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actions.map((act) => (
                      <SelectItem key={act.value} value={act.value}>
                        {act.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="flex gap-3 justify-end border-t border-border pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateRule}
                disabled={createRuleMutation.isPending}
              >
                {createRuleMutation.isPending ? "Creating..." : "Create Rule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trigger Event Simulator */}
      <Card className="p-6 border-2 border-accent/20">
        <h2 className="text-lg font-semibold text-foreground mb-4">Test Workflow Trigger</h2>
        <p className="text-sm text-muted mb-4">
          Simulate a webhook event to test your workflows without waiting for real events.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Event Type</label>
            <Select value={triggerEvent} onValueChange={setTriggerEvent}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {triggerEvents.map((event) => (
                  <SelectItem key={event.value} value={event.value}>
                    {event.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Event Payload (JSON)</label>
            <textarea
              placeholder='{"status": "active", "entityType": "contact"}'
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="w-full mt-1 p-3 border border-border rounded-md text-sm font-mono bg-muted/5"
              rows={4}
            />
            <p className="text-xs text-muted mt-1">Leave empty to use default payload</p>
          </div>

          <Button
            onClick={handleSimulateTrigger}
            disabled={simulateTriggerMutation.isPending}
            className="w-full"
          >
            {simulateTriggerMutation.isPending ? "Triggering..." : "🎯 Trigger Event"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
