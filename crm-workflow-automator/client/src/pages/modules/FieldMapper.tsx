import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function FieldMapper() {
  const [showDialog, setShowDialog] = useState(false);
  const [mappingName, setMappingName] = useState("");
  const [sourceSystem, setSourceSystem] = useState<"hubspot" | "salesforce">("hubspot");
  const [targetSystem, setTargetSystem] = useState<"hubspot" | "salesforce">("salesforce");
  const [entityType, setEntityType] = useState<"contact" | "deal" | "lead" | "opportunity" | "pipeline">("contact");
  const [mappingConfig, setMappingConfig] = useState<Record<string, string>>({});
  const [sourceField, setSourceField] = useState("");
  const [targetField, setTargetField] = useState("");

  const mappingsQuery = trpc.fieldMapper.getMappings.useQuery();
  const createMappingMutation = trpc.fieldMapper.createMapping.useMutation();
  const updateMappingMutation = trpc.fieldMapper.updateMapping.useMutation();
  const deleteMappingMutation = trpc.fieldMapper.deleteMapping.useMutation();

  const fieldOptions = {
    hubspot: {
      contact: ["firstname", "lastname", "email", "phone", "company", "lifecyclestage"],
      deal: ["dealname", "dealstage", "amount", "closedate", "dealowner"],
      pipeline: ["pipelineid", "label", "stages"],
    },
    salesforce: {
      contact: ["FirstName", "LastName", "Email", "Phone", "Company", "LeadSource"],
      lead: ["FirstName", "LastName", "Email", "Phone", "Company", "LeadSource"],
      opportunity: ["Name", "StageName", "Amount", "CloseDate", "OwnerId"],
      pipeline: ["Id", "Label", "Stages"],
    },
  };

  const handleAddFieldMapping = () => {
    if (!sourceField || !targetField) {
      toast.error("Please select both source and target fields");
      return;
    }

    setMappingConfig((prev) => ({
      ...prev,
      [sourceField]: targetField,
    }));

    setSourceField("");
    setTargetField("");
    toast.success("Field mapping added");
  };

  const handleRemoveFieldMapping = (sourceField: string) => {
    setMappingConfig((prev) => {
      const newConfig = { ...prev };
      delete newConfig[sourceField];
      return newConfig;
    });
  };

  const handleCreateMapping = async () => {
    if (!mappingName || Object.keys(mappingConfig).length === 0) {
      toast.error("Please enter a name and add at least one field mapping");
      return;
    }

    try {
      await createMappingMutation.mutateAsync({
        mappingName,
        sourceSystem,
        targetSystem,
        entityType,
        mappingConfig,
      });

      toast.success("Field mapping created successfully!");
      setShowDialog(false);
      setMappingName("");
      setMappingConfig({});
      mappingsQuery.refetch();
    } catch (error) {
      toast.error("Failed to create field mapping");
    }
  };

  const handleDeleteMapping = async (mappingId: number) => {
    try {
      await deleteMappingMutation.mutateAsync({ mappingId });
      toast.success("Field mapping deleted");
      mappingsQuery.refetch();
    } catch (error) {
      toast.error("Failed to delete field mapping");
    }
  };

  const sourceFields =
    fieldOptions[sourceSystem]?.[
      entityType as keyof (typeof fieldOptions)[typeof sourceSystem]
    ] || [];
  const targetFields =
    fieldOptions[targetSystem]?.[
      entityType as keyof (typeof fieldOptions)[typeof targetSystem]
    ] || [];

  return (
    <div className="space-y-6">
      {/* Create Mapping Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowDialog(true)}>+ Create New Mapping</Button>
      </div>

      {/* Existing Mappings */}
      {mappingsQuery.data && mappingsQuery.data.length > 0 ? (
        <div className="space-y-4">
          {mappingsQuery.data.map((mapping) => (
            <Card key={mapping.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{mapping.mappingName}</h3>
                  <p className="text-sm text-muted">
                    {mapping.sourceSystem} → {mapping.targetSystem} ({mapping.entityType})
                  </p>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      mapping.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200"
                    }`}
                  >
                    {mapping.isActive ? "Active" : "Inactive"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteMapping(mapping.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Field Mappings Display */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Field Mappings:</p>
                <div className="space-y-1">
                  {Object.entries(mapping.mappingConfig as Record<string, string>).map(
                    ([source, target]) => (
                      <div key={source} className="flex items-center gap-2 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 rounded">
                          {source}
                        </span>
                        <span className="text-muted">→</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 rounded">
                          {target}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted mb-4">No field mappings yet</p>
          <Button onClick={() => setShowDialog(true)}>Create Your First Mapping</Button>
        </Card>
      )}

      {/* Create Mapping Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Field Mapping</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Mapping Name */}
            <div>
              <label className="text-sm font-medium text-foreground">Mapping Name</label>
              <Input
                placeholder="e.g., HubSpot to Salesforce Contacts"
                value={mappingName}
                onChange={(e) => setMappingName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* System Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Source System</label>
                <Select value={sourceSystem} onValueChange={(v) => setSourceSystem(v as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hubspot">HubSpot</SelectItem>
                    <SelectItem value="salesforce">Salesforce</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Target System</label>
                <Select value={targetSystem} onValueChange={(v) => setTargetSystem(v as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hubspot">HubSpot</SelectItem>
                    <SelectItem value="salesforce">Salesforce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Entity Type */}
            <div>
              <label className="text-sm font-medium text-foreground">Entity Type</label>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as any)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="deal">Deal</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                  <SelectItem value="pipeline">Pipeline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Field Mapping Builder */}
            <div className="border-t border-border pt-4">
              <h3 className="font-medium text-foreground mb-3">Add Field Mappings</h3>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted">Source Field</label>
                    <Select value={sourceField} onValueChange={setSourceField}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceFields.map((field) => (
                          <SelectItem key={field} value={field}>
                            {field}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-muted">Target Field</label>
                    <Select value={targetField} onValueChange={setTargetField}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetFields.map((field) => (
                          <SelectItem key={field} value={field}>
                            {field}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleAddFieldMapping}
                  className="w-full"
                >
                  + Add Field Mapping
                </Button>
              </div>

              {/* Current Mappings Preview */}
              {Object.keys(mappingConfig).length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">Current Mappings:</p>
                  {Object.entries(mappingConfig).map(([source, target]) => (
                    <div
                      key={source}
                      className="flex items-center justify-between p-2 bg-muted/10 rounded"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{source}</span>
                        <span className="text-muted">→</span>
                        <span className="font-medium">{target}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFieldMapping(source)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dialog Actions */}
            <div className="flex gap-3 justify-end border-t border-border pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateMapping}
                disabled={createMappingMutation.isPending || Object.keys(mappingConfig).length === 0}
              >
                {createMappingMutation.isPending ? "Creating..." : "Create Mapping"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
