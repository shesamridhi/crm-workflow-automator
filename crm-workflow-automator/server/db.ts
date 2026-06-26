import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  crmConnections,
  fieldMappings,
  workflowRules,
  syncHistory,
  activityLog,
  dataMigrationJobs,
  deduplicationCache,
  sandboxData,
  webhookEvents,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// CRM Connection queries
export async function getCrmConnections(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(crmConnections)
    .where(eq(crmConnections.userId, userId));
}

export async function getCrmConnection(userId: number, crmType: "hubspot" | "salesforce") {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(crmConnections)
    .where(
      and(
        eq(crmConnections.userId, userId),
        eq(crmConnections.crmType, crmType)
      )
    )
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// Field Mapping queries
export async function getFieldMappings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(fieldMappings)
    .where(eq(fieldMappings.userId, userId));
}

export async function getFieldMapping(mappingId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(fieldMappings)
    .where(eq(fieldMappings.id, mappingId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// Workflow Rule queries
export async function getWorkflowRules(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(workflowRules)
    .where(eq(workflowRules.userId, userId));
}

export async function getWorkflowRule(ruleId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(workflowRules)
    .where(eq(workflowRules.id, ruleId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// Sync History queries
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

// Activity Log queries
export async function getActivityLog(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(activityLog)
    .where(eq(activityLog.userId, userId))
    .orderBy(activityLog.createdAt)
    .limit(limit);
}

export async function logActivity(
  userId: number,
  activityType: string,
  details: {
    resourceType?: string;
    resourceId?: string;
    description?: string;
    httpStatus?: number;
    httpMethod?: string;
    endpoint?: string;
    requestPayload?: string;
    responsePayload?: string;
    errorDetails?: string;
    ipAddress?: string;
    userAgent?: string;
    executionTime?: number;
  }
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(activityLog).values({
      userId,
      activityType: activityType as any,
      ...details,
    });
    return result;
  } catch (error) {
    console.error("[Database] Failed to log activity:", error);
    return null;
  }
}

// Data Migration Job queries
export async function getDataMigrationJobs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(dataMigrationJobs)
    .where(eq(dataMigrationJobs.userId, userId));
}

export async function getDataMigrationJob(jobId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(dataMigrationJobs)
    .where(eq(dataMigrationJobs.id, jobId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// Deduplication Cache queries
export async function getDeduplicationCacheByEmailHash(
  userId: number,
  emailHash: string,
  system: "hubspot" | "salesforce"
) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(deduplicationCache)
    .where(
      and(
        eq(deduplicationCache.userId, userId),
        eq(deduplicationCache.emailHash, emailHash),
        eq(deduplicationCache.system, system)
      )
    )
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// Sandbox Data queries
export async function getSandboxData(userId: number, system: "hubspot" | "salesforce") {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(sandboxData)
    .where(
      and(
        eq(sandboxData.userId, userId),
        eq(sandboxData.system, system)
      )
    );
}

// Webhook Event queries
export async function getWebhookEvents(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.userId, userId))
    .orderBy(webhookEvents.createdAt)
    .limit(limit);
}

export async function getWebhookEvent(eventId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.id, eventId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}
