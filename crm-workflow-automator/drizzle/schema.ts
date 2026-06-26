import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
  decimal,
  longtext,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * CRM Connections - Stores OAuth tokens and connection metadata for HubSpot and Salesforce
 */
export const crmConnections = mysqlTable("crm_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  crmType: mysqlEnum("crmType", ["hubspot", "salesforce"]).notNull(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  instanceUrl: varchar("instanceUrl", { length: 512 }), // For Salesforce
  clientId: varchar("clientId", { length: 256 }).notNull(),
  clientSecret: varchar("clientSecret", { length: 256 }).notNull(),
  isConnected: boolean("isConnected").default(false).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrmConnection = typeof crmConnections.$inferSelect;
export type InsertCrmConnection = typeof crmConnections.$inferInsert;

/**
 * Field Mappings - Stores dynamic field mapping configurations between HubSpot and Salesforce
 */
export const fieldMappings = mysqlTable("field_mappings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  mappingName: varchar("mappingName", { length: 256 }).notNull(),
  sourceSystem: mysqlEnum("sourceSystem", ["hubspot", "salesforce"]).notNull(),
  targetSystem: mysqlEnum("targetSystem", ["hubspot", "salesforce"]).notNull(),
  entityType: mysqlEnum("entityType", ["contact", "deal", "lead", "opportunity", "pipeline"]).notNull(),
  mappingConfig: json("mappingConfig").notNull(), // { "sourceField": "targetField", ... }
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FieldMapping = typeof fieldMappings.$inferSelect;
export type InsertFieldMapping = typeof fieldMappings.$inferInsert;

/**
 * Workflow Rules - Stores IF/THEN workflow configurations
 */
export const workflowRules = mysqlTable("workflow_rules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  ruleName: varchar("ruleName", { length: 256 }).notNull(),
  description: text("description"),
  triggerEvent: varchar("triggerEvent", { length: 256 }).notNull(), // e.g., "contact_created_hubspot"
  triggerCondition: json("triggerCondition").notNull(), // { "field": "status", "operator": "equals", "value": "active" }
  action: varchar("action", { length: 256 }).notNull(), // e.g., "sync_to_salesforce"
  actionPayload: json("actionPayload"), // Additional action configuration
  isActive: boolean("isActive").default(true).notNull(),
  executionCount: int("executionCount").default(0).notNull(),
  lastExecutedAt: timestamp("lastExecutedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkflowRule = typeof workflowRules.$inferSelect;
export type InsertWorkflowRule = typeof workflowRules.$inferInsert;

/**
 * Sync History - Tracks all sync operations between CRM systems
 */
export const syncHistory = mysqlTable("sync_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sourceSystem: mysqlEnum("sourceSystem", ["hubspot", "salesforce"]).notNull(),
  targetSystem: mysqlEnum("targetSystem", ["hubspot", "salesforce"]).notNull(),
  entityType: mysqlEnum("entityType", ["contact", "deal", "lead", "opportunity", "pipeline"]).notNull(),
  entityId: varchar("entityId", { length: 256 }).notNull(),
  syncDirection: mysqlEnum("syncDirection", ["one_way", "bidirectional"]).notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "success", "failed", "partial"]).default("pending").notNull(),
  recordsProcessed: int("recordsProcessed").default(0).notNull(),
  recordsSucceeded: int("recordsSucceeded").default(0).notNull(),
  recordsFailed: int("recordsFailed").default(0).notNull(),
  sourcePayload: longtext("sourcePayload"), // Original data from source
  transformedPayload: longtext("transformedPayload"), // After field mapping
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SyncHistory = typeof syncHistory.$inferSelect;
export type InsertSyncHistory = typeof syncHistory.$inferInsert;

/**
 * Activity Log - Comprehensive audit trail of all operations
 */
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  activityType: mysqlEnum("activityType", [
    "oauth_connect",
    "oauth_disconnect",
    "field_mapping_created",
    "field_mapping_updated",
    "field_mapping_deleted",
    "workflow_created",
    "workflow_updated",
    "workflow_deleted",
    "workflow_triggered",
    "sync_started",
    "sync_completed",
    "sync_failed",
    "csv_upload",
    "data_migration",
    "webhook_received",
    "webhook_processed",
    "webhook_failed",
  ]).notNull(),
  resourceType: varchar("resourceType", { length: 128 }),
  resourceId: varchar("resourceId", { length: 256 }),
  description: text("description"),
  httpStatus: int("httpStatus"),
  httpMethod: varchar("httpMethod", { length: 16 }),
  endpoint: varchar("endpoint", { length: 512 }),
  requestPayload: longtext("requestPayload"),
  responsePayload: longtext("responsePayload"),
  errorDetails: text("errorDetails"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  executionTime: int("executionTime"), // milliseconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

/**
 * Data Migration Jobs - Tracks CSV uploads and ETL pipeline execution
 */
export const dataMigrationJobs = mysqlTable("data_migration_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  jobName: varchar("jobName", { length: 256 }).notNull(),
  sourceFile: varchar("sourceFile", { length: 512 }).notNull(),
  entityType: mysqlEnum("entityType", ["contact", "deal", "lead", "opportunity"]).notNull(),
  targetSystem: mysqlEnum("targetSystem", ["hubspot", "salesforce"]).notNull(),
  totalRecords: int("totalRecords").default(0).notNull(),
  processedRecords: int("processedRecords").default(0).notNull(),
  successfulRecords: int("successfulRecords").default(0).notNull(),
  failedRecords: int("failedRecords").default(0).notNull(),
  duplicatesDetected: int("duplicatesDetected").default(0).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  csvData: longtext("csvData"), // Original CSV content
  transformedData: longtext("transformedData"), // After ETL processing
  errorLog: longtext("errorLog"), // Detailed error information
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DataMigrationJob = typeof dataMigrationJobs.$inferSelect;
export type InsertDataMigrationJob = typeof dataMigrationJobs.$inferInsert;

/**
 * Deduplication Cache - Stores email hashes for quick duplicate detection
 */
export const deduplicationCache = mysqlTable("deduplication_cache", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  entityType: mysqlEnum("entityType", ["contact", "deal", "lead", "opportunity"]).notNull(),
  system: mysqlEnum("system", ["hubspot", "salesforce"]).notNull(),
  emailHash: varchar("emailHash", { length: 64 }).notNull(),
  entityId: varchar("entityId", { length: 256 }).notNull(),
  email: varchar("email", { length: 320 }),
  firstName: varchar("firstName", { length: 256 }),
  lastName: varchar("lastName", { length: 256 }),
  phone: varchar("phone", { length: 20 }),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeduplicationCache = typeof deduplicationCache.$inferSelect;
export type InsertDeduplicationCache = typeof deduplicationCache.$inferInsert;

/**
 * Sandbox Data - Mock data for HubSpot and Salesforce entities
 */
export const sandboxData = mysqlTable("sandbox_data", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  system: mysqlEnum("system", ["hubspot", "salesforce"]).notNull(),
  entityType: mysqlEnum("entityType", ["contact", "deal", "lead", "opportunity", "pipeline"]).notNull(),
  entityData: json("entityData").notNull(), // Full entity object
  externalId: varchar("externalId", { length: 256 }).notNull(),
  syncedToOtherSystem: boolean("syncedToOtherSystem").default(false).notNull(),
  lastModifiedAt: timestamp("lastModifiedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SandboxData = typeof sandboxData.$inferSelect;
export type InsertSandboxData = typeof sandboxData.$inferInsert;

/**
 * Webhook Events - Stores incoming webhook events for audit and replay
 */
export const webhookEvents = mysqlTable("webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventType: varchar("eventType", { length: 256 }).notNull(),
  source: mysqlEnum("source", ["hubspot", "salesforce", "manual"]).notNull(),
  payload: longtext("payload").notNull(),
  processedAt: timestamp("processedAt"),
  status: mysqlEnum("status", ["received", "processing", "processed", "failed"]).default("received").notNull(),
  errorMessage: text("errorMessage"),
  matchedRules: json("matchedRules"), // Array of rule IDs that matched
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;
