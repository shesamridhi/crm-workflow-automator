import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function DataMigration() {
  const [jobName, setJobName] = useState("");
  const [entityType, setEntityType] = useState<"contact" | "deal" | "lead" | "opportunity">("contact");
  const [targetSystem, setTargetSystem] = useState<"hubspot" | "salesforce">("salesforce");
  const [csvContent, setCsvContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const jobsQuery = trpc.etl.getJobs.useQuery();
  const executeMutation = trpc.etl.execute.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    try {
      const content = await file.text();
      setCsvContent(content);
      setJobName(file.name.replace(".csv", ""));
      toast.success("CSV file loaded successfully");
    } catch (error) {
      toast.error("Failed to read CSV file");
    }
  };

  const handleExecuteETL = async () => {
    if (!jobName || !csvContent) {
      toast.error("Please enter a job name and select a CSV file");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await executeMutation.mutateAsync({
        jobName,
        entityType,
        targetSystem,
        csvContent,
      });

      toast.success(
        `ETL completed! ${result.successfulRecords}/${result.totalRecords} records processed`
      );

      setCsvContent("");
      setJobName("");
      jobsQuery.refetch();
    } catch (error) {
      toast.error("ETL execution failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* CSV Upload Section */}
      <Card className="p-6 border-2 border-dashed border-accent/30">
        <h2 className="text-lg font-semibold text-foreground mb-4">Upload CSV File</h2>

        <div className="space-y-4">
          {/* File Input */}
          <div>
            <label className="text-sm font-medium text-foreground">Select CSV File</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                📁 Choose File
              </Button>
              {csvContent && (
                <span className="text-sm text-green-600 dark:text-green-400">✓ File loaded</span>
              )}
            </div>
          </div>

          {/* Job Configuration */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Job Name</label>
              <Input
                placeholder="e.g., Q1 Contacts Import"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                className="mt-1"
              />
            </div>

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

          {/* CSV Preview */}
          {csvContent && (
            <div>
              <label className="text-sm font-medium text-foreground">CSV Preview</label>
              <div className="mt-2 p-3 bg-muted/5 rounded border border-border max-h-40 overflow-auto">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words">
                  {csvContent.split("\n").slice(0, 5).join("\n")}
                  {csvContent.split("\n").length > 5 && "\n..."}
                </pre>
              </div>
            </div>
          )}

          {/* ETL Pipeline Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-foreground">
            <p className="font-medium mb-2">ETL Pipeline Processing:</p>
            <ul className="list-disc list-inside space-y-1 text-muted">
              <li>Data cleaning and trimming</li>
              <li>Email-hash based deduplication</li>
              <li>Phone number normalization (E.164 format)</li>
              <li>Date format standardization</li>
              <li>Invalid data detection and reporting</li>
            </ul>
          </div>

          {/* Execute Button */}
          <Button
            onClick={handleExecuteETL}
            disabled={isProcessing || !csvContent || !jobName}
            className="w-full"
            size="lg"
          >
            {isProcessing ? "Processing..." : "🚀 Execute ETL Pipeline"}
          </Button>
        </div>
      </Card>

      {/* Migration Jobs History */}
      {jobsQuery.data && jobsQuery.data.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Migration Jobs</h2>
          <div className="space-y-4">
            {jobsQuery.data.map((job) => (
              <Card key={job.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{job.jobName}</h3>
                    <p className="text-sm text-muted">
                      {job.entityType} → {job.targetSystem}
                    </p>
                  </div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      job.status === "completed"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                        : job.status === "failed"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted">Total Records</p>
                    <p className="text-lg font-bold text-foreground">{job.totalRecords}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Processed</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {job.processedRecords}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Failed</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {job.failedRecords}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Duplicates</p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {job.duplicatesDetected}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Success Rate</p>
                    <p className="text-lg font-bold text-foreground">
                      {job.totalRecords > 0
                        ? Math.round((job.successfulRecords / job.totalRecords) * 100)
                        : 0}
                      %
                    </p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="text-xs text-muted space-y-1 border-t border-border pt-3">
                  {job.startedAt && (
                    <p>Started: {new Date(job.startedAt).toLocaleString()}</p>
                  )}
                  {job.completedAt && (
                    <p>Completed: {new Date(job.completedAt).toLocaleString()}</p>
                  )}
                </div>

                {/* Error Log */}
                {job.errorLog && (
                  <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                    <p className="font-medium text-red-800 dark:text-red-200">Errors:</p>
                    <pre className="text-red-700 dark:text-red-300 whitespace-pre-wrap break-words">
                      {typeof job.errorLog === "string"
                        ? job.errorLog.substring(0, 200)
                        : JSON.stringify(job.errorLog).substring(0, 200)}
                    </pre>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted mb-4">No migration jobs yet</p>
          <p className="text-sm text-muted">Upload a CSV file above to start your first ETL job</p>
        </Card>
      )}

      {/* CSV Format Guide */}
      <Card className="p-6 bg-purple-50 dark:bg-purple-900/20 border-0">
        <h3 className="font-semibold text-foreground mb-3">CSV Format Guide</h3>
        <div className="space-y-3 text-sm text-foreground">
          <p>Your CSV file should include the following columns:</p>
          <div className="bg-white dark:bg-black/20 p-3 rounded font-mono text-xs">
            <p>firstname,lastname,email,phone,company</p>
            <p>John,Doe,john@example.com,+14155552671,Acme Inc</p>
            <p>Jane,Smith,jane@example.com,+14155552672,Tech Corp</p>
          </div>
          <ul className="list-disc list-inside space-y-1 text-muted">
            <li>Email addresses are used for deduplication</li>
            <li>Phone numbers are normalized to E.164 format</li>
            <li>Duplicate records are automatically detected and removed</li>
            <li>Invalid data is logged and excluded from import</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
