import { getDb, logActivity } from "../db";
import { syncHistory, fieldMappings } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { applyFieldMapping } from "../utils/dataTransform";

export interface SyncPayload {
  entityType: "contact" | "deal" | "lead" | "opportunity" | "pipeline";
  entityId: string;
  data: Record<string, any>;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  transformedData?: Record<string, any>;
  error?: string;
}

/**
 * Execute bidirectional sync between HubSpot and Salesforce
 */
export async function executeBidirectionalSync(
  userId: number,
  sourceSystem: "hubspot" | "salesforce",
  targetSystem: "hubspot" | "salesforce",
  payload: SyncPayload,
  mappingId?: number
): Promise<SyncResult> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 1, error: "Database unavailable" };
    }

    const startTime = Date.now();

    // Fetch field mapping if provided
    let mappingConfig: Record<string, string> | null = null;
    if (mappingId) {
      const mapping = await db
        .select()
        .from(fieldMappings)
        .where(eq(fieldMappings.id, mappingId))
        .limit(1);

      if (mapping.length > 0 && mapping[0].mappingConfig) {
        mappingConfig = mapping[0].mappingConfig as Record<string, string>;
      }
    }

    // Apply field mapping if available
    let transformedData = payload.data;
    if (mappingConfig) {
      transformedData = applyFieldMapping(payload.data, mappingConfig);
    }

    // Create sync history record
    const syncRecords = await db.insert(syncHistory).values({
      userId,
      sourceSystem,
      targetSystem,
      entityType: payload.entityType,
      entityId: payload.entityId,
      syncDirection: "bidirectional",
      status: "in_progress",
      recordsProcessed: 1,
      sourcePayload: JSON.stringify(payload.data),
      transformedPayload: JSON.stringify(transformedData),
      startedAt: new Date(),
    });

    // Get the inserted ID from the result
    const syncId = (syncRecords as any).insertId || 1;

    // Simulate sync operation
    const syncSuccess = Math.random() > 0.1; // 90% success rate for simulation

    if (syncSuccess) {
      // Update sync history to success
      await db
        .update(syncHistory)
        .set({
          status: "success",
          recordsSucceeded: 1,
          completedAt: new Date(),
        })
        .where(eq(syncHistory.id, syncId as number));

      const executionTime = Date.now() - startTime;
      await logActivity(userId, "sync_completed", {
        resourceType: "sync",
        resourceId: payload.entityId,
        description: `Synced ${payload.entityType} from ${sourceSystem} to ${targetSystem}`,
        httpStatus: 200,
        httpMethod: "POST",
        endpoint: `/api/sync`,
        requestPayload: JSON.stringify(payload),
        responsePayload: JSON.stringify(transformedData),
        executionTime,
      });

      return {
        success: true,
        recordsProcessed: 1,
        recordsSucceeded: 1,
        recordsFailed: 0,
        transformedData,
      };
    } else {
      // Update sync history to failed
      const errorMsg = "Sync operation failed";
      await db
        .update(syncHistory)
        .set({
          status: "failed",
          recordsFailed: 1,
          errorMessage: errorMsg,
          completedAt: new Date(),
        })
        .where(eq(syncHistory.id, syncId as number));

      const executionTime = Date.now() - startTime;
      await logActivity(userId, "sync_failed", {
        resourceType: "sync",
        resourceId: payload.entityId,
        description: `Failed to sync ${payload.entityType}`,
        httpStatus: 500,
        httpMethod: "POST",
        endpoint: `/api/sync`,
        errorDetails: errorMsg,
        executionTime,
      });

      return {
        success: false,
        recordsProcessed: 1,
        recordsSucceeded: 0,
        recordsFailed: 1,
        error: errorMsg,
      };
    }
  } catch (error) {
    console.error("[SyncEngine] Error during sync:", error);
    await logActivity(userId, "sync_failed", {
      resourceType: "sync",
      resourceId: payload.entityId,
      description: `Sync error: ${error}`,
      httpStatus: 500,
      errorDetails: String(error),
    });

    return {
      success: false,
      recordsProcessed: 1,
      recordsSucceeded: 0,
      recordsFailed: 1,
      error: "Sync operation failed",
    };
  }
}

/**
 * Execute unidirectional sync (source to target only)
 */
export async function executeUnidirectionalSync(
  userId: number,
  sourceSystem: "hubspot" | "salesforce",
  targetSystem: "hubspot" | "salesforce",
  payload: SyncPayload,
  mappingId?: number
): Promise<SyncResult> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 1, error: "Database unavailable" };
    }

    const startTime = Date.now();

    // Fetch field mapping if provided
    let mappingConfig: Record<string, string> | null = null;
    if (mappingId) {
      const mapping = await db
        .select()
        .from(fieldMappings)
        .where(eq(fieldMappings.id, mappingId))
        .limit(1);

      if (mapping.length > 0 && mapping[0].mappingConfig) {
        mappingConfig = mapping[0].mappingConfig as Record<string, string>;
      }
    }

    // Apply field mapping if available
    let transformedData = payload.data;
    if (mappingConfig) {
      transformedData = applyFieldMapping(payload.data, mappingConfig);
    }

    // Create sync history record
    const syncRecords = await db.insert(syncHistory).values({
      userId,
      sourceSystem,
      targetSystem,
      entityType: payload.entityType,
      entityId: payload.entityId,
      syncDirection: "one_way",
      status: "in_progress",
      recordsProcessed: 1,
      sourcePayload: JSON.stringify(payload.data),
      transformedPayload: JSON.stringify(transformedData),
      startedAt: new Date(),
    });

    // Get the inserted ID from the result
    const syncId = (syncRecords as any).insertId || 1;

    // Simulate sync operation
    const syncSuccess = Math.random() > 0.1; // 90% success rate

    if (syncSuccess) {
      await db
        .update(syncHistory)
        .set({
          status: "success",
          recordsSucceeded: 1,
          completedAt: new Date(),
        })
        .where(eq(syncHistory.id, syncId as number));

      const executionTime = Date.now() - startTime;
      await logActivity(userId, "sync_completed", {
        resourceType: "sync",
        resourceId: payload.entityId,
        description: `One-way sync: ${sourceSystem} → ${targetSystem}`,
        httpStatus: 200,
        httpMethod: "POST",
        endpoint: `/api/sync/one-way`,
        requestPayload: JSON.stringify(payload),
        responsePayload: JSON.stringify(transformedData),
        executionTime,
      });

      return {
        success: true,
        recordsProcessed: 1,
        recordsSucceeded: 1,
        recordsFailed: 0,
        transformedData,
      };
    } else {
      const errorMsg = "One-way sync failed";
      await db
        .update(syncHistory)
        .set({
          status: "failed",
          recordsFailed: 1,
          errorMessage: errorMsg,
          completedAt: new Date(),
        })
        .where(eq(syncHistory.id, syncId as number));

      const executionTime = Date.now() - startTime;
      await logActivity(userId, "sync_failed", {
        resourceType: "sync",
        resourceId: payload.entityId,
        description: `One-way sync failed`,
        httpStatus: 500,
        errorDetails: errorMsg,
        executionTime,
      });

      return {
        success: false,
        recordsProcessed: 1,
        recordsSucceeded: 0,
        recordsFailed: 1,
        error: errorMsg,
      };
    }
  } catch (error) {
    console.error("[SyncEngine] Error during one-way sync:", error);
    await logActivity(userId, "sync_failed", {
      resourceType: "sync",
      resourceId: payload.entityId,
      description: `Sync error: ${error}`,
      httpStatus: 500,
      errorDetails: String(error),
    });

    return {
      success: false,
      recordsProcessed: 1,
      recordsSucceeded: 0,
      recordsFailed: 1,
      error: "Sync operation failed",
    };
  }
}

/**
 * Get sync history for a user
 */
export async function getSyncHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(syncHistory)
    .where(eq(syncHistory.userId, userId))
    .orderBy(syncHistory.createdAt)
    .limit(limit);
}
