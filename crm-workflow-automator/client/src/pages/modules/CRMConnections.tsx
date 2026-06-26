import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CRMConnections() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCRM, setSelectedCRM] = useState<"hubspot" | "salesforce" | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const connectionsQuery = trpc.crm.getConnections.useQuery();
  const connectMutation = trpc.crm.connect.useMutation();
  const disconnectMutation = trpc.crm.disconnect.useMutation();
  const initSandboxMutation = trpc.sandbox.initialize.useMutation();

  const handleConnect = async () => {
    if (!selectedCRM || !clientId || !clientSecret) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await connectMutation.mutateAsync({
        crmType: selectedCRM,
        clientId,
        clientSecret,
      });

      // Initialize sandbox data
      await initSandboxMutation.mutateAsync({ system: selectedCRM });

      toast.success(`Connected to ${selectedCRM}!`);
      setShowDialog(false);
      setClientId("");
      setClientSecret("");
      setSelectedCRM(null);
      connectionsQuery.refetch();
    } catch (error) {
      toast.error("Failed to connect CRM");
    }
  };

  const handleDisconnect = async (crmType: "hubspot" | "salesforce") => {
    try {
      await disconnectMutation.mutateAsync({ crmType });
      toast.success(`Disconnected from ${crmType}`);
      connectionsQuery.refetch();
    } catch (error) {
      toast.error("Failed to disconnect CRM");
    }
  };

  const crmList = [
    {
      name: "HubSpot",
      type: "hubspot" as const,
      icon: "🔵",
      description: "Connect your HubSpot CRM account",
      color: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      name: "Salesforce",
      type: "salesforce" as const,
      icon: "☁️",
      description: "Connect your Salesforce instance",
      color: "bg-blue-50 dark:bg-blue-900/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Connection Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {crmList.map((crm) => {
          const connection = connectionsQuery.data?.find((c) => c.crmType === crm.type);
          const isConnected = connection?.isConnected;

          return (
            <Card key={crm.type} className={`p-6 ${crm.color} border-0`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{crm.icon}</span>
                  <div>
                    <h3 className="font-semibold text-foreground">{crm.name}</h3>
                    <p className="text-sm text-muted">{crm.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {isConnected ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-sm font-medium text-green-700 dark:text-green-200">
                        Connected
                      </span>
                    </div>
                    <div className="text-xs text-muted space-y-1">
                      <p>Client ID: {connection.clientId.substring(0, 10)}...</p>
                      {connection.lastSyncAt && (
                        <p>
                          Last sync: {new Date(connection.lastSyncAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(crm.type)}
                      className="w-full"
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      setSelectedCRM(crm.type);
                      setShowDialog(true);
                    }}
                    className="w-full"
                  >
                    Connect {crm.name}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Connection Details */}
      {connectionsQuery.data && connectionsQuery.data.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Connection Details</h2>
          <Card className="p-6">
            <div className="space-y-4">
              {connectionsQuery.data.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground capitalize">{conn.crmType}</p>
                    <p className="text-sm text-muted">
                      Status: {conn.isConnected ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    {conn.tokenExpiresAt && (
                      <p className="text-muted">
                        Expires: {new Date(conn.tokenExpiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* OAuth Connection Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Connect {selectedCRM === "hubspot" ? "HubSpot" : "Salesforce"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Client ID</label>
              <Input
                placeholder="Enter your Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted mt-1">
                Get this from your {selectedCRM === "hubspot" ? "HubSpot" : "Salesforce"} app
                settings
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Client Secret</label>
              <Input
                placeholder="Enter your Client Secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted mt-1">Keep this secure and never share it</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
              <p className="text-xs text-foreground">
                <strong>Note:</strong> This is a mock OAuth flow for demonstration. In production,
                this would redirect to the actual {selectedCRM === "hubspot" ? "HubSpot" : "Salesforce"}{" "}
                OAuth authorization page.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConnect} disabled={connectMutation.isPending}>
                {connectMutation.isPending ? "Connecting..." : "Connect"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* OAuth Flow Information */}
      <Card className="p-6 bg-purple-50 dark:bg-purple-900/20 border-0">
        <h3 className="font-semibold text-foreground mb-3">OAuth 2.0 Flow</h3>
        <div className="space-y-2 text-sm text-foreground">
          <p>
            This application uses OAuth 2.0 to securely connect to your CRM systems. The flow
            includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted">
            <li>Client ID and Secret exchange</li>
            <li>Secure token storage and management</li>
            <li>Automatic token refresh before expiration</li>
            <li>Encrypted credential handling</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
