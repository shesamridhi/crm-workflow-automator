import { getDb, logActivity } from "../db";
import { dataMigrationJobs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { runETLPipeline, parseCSV, deduplicateByEmailHash } from "../utils/dataTransform";

export interface ETLJobConfig {
  jobName: string;
  entityType: "contact" | "deal" | "lead" | "opportunity";
  targetSystem: "hubspot" | "salesforce";
  csvContent: string;
  options?: {
    cleanData?: boolean;
    normalizePhones?: boolean;
    normalizeEmails?: boolean;
    deduplicateByEmail?: boolean;
    phoneField?: string;
    emailField?: string;
  };
}

export interface ETLJobResult {
  jobId: number;
  success: boolean;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicatesDetected: number;
  transformedData: Record<string, any>[];
  errors: Array<{ recordIndex: number; error: string }>;
}

/**
 * Create and execute ETL job
 */
export async function createAndExecuteETLJob(
  userId: number,
  config: ETLJobConfig
): Promise<ETLJobResult> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }

    const startTime = Date.now();

    // Create job record
    const jobRecord = await db.insert(dataMigrationJobs).values({
      userId,
      jobName: config.jobName,
      sourceFile: `${config.jobName}_${Date.now()}.csv`,
      entityType: config.entityType,
      targetSystem: config.targetSystem,
      status: "processing",
      csvData: config.csvContent,
      startedAt: new Date(),
    });

    const jobId = (jobRecord as any).insertId || 1;

    // Parse CSV
    let records: Record<string, any>[] = [];
    try {
      records = parseCSV(config.csvContent);
    } catch (error) {
      await db
        .update(dataMigrationJobs)
        .set({
          status: "failed",
          errorLog: `CSV parsing failed: ${error}`,
          completedAt: new Date(),
        })
        .where(eq(dataMigrationJobs.id, jobId as number));

      throw new Error(`CSV parsing failed: ${error}`);
    }

    // Run ETL pipeline
    const etlResult = runETLPipeline(records, config.options);

    // Update job with results
    await db
      .update(dataMigrationJobs)
      .set({
        totalRecords: etlResult.stats.total,
        processedRecords: etlResult.stats.successful,
        successfulRecords: etlResult.stats.successful,
        failedRecords: etlResult.stats.failed,
        duplicatesDetected: etlResult.stats.duplicatesRemoved,
        transformedData: JSON.stringify(etlResult.processed),
        errorLog: JSON.stringify(etlResult.errors),
        status: etlResult.errors.length === 0 ? "completed" : "completed",
        completedAt: new Date(),
      })
      .where(eq(dataMigrationJobs.id, jobId as number));

    // Log activity
    const executionTime = Date.now() - startTime;
    await logActivity(userId, "data_migration", {
      resourceType: "etl_job",
      resourceId: String(jobId),
      description: `ETL job "${config.jobName}" completed: ${etlResult.stats.successful}/${etlResult.stats.total} records processed`,
      httpStatus: 200,
      httpMethod: "POST",
      endpoint: "/api/etl/execute",
      requestPayload: JSON.stringify({
        jobName: config.jobName,
        entityType: config.entityType,
        targetSystem: config.targetSystem,
        totalRecords: etlResult.stats.total,
      }),
      responsePayload: JSON.stringify({
        successful: etlResult.stats.successful,
        failed: etlResult.stats.failed,
        duplicatesRemoved: etlResult.stats.duplicatesRemoved,
      }),
      executionTime,
    });

    return {
      jobId: jobId as number,
      success: true,
      totalRecords: etlResult.stats.total,
      processedRecords: etlResult.stats.successful,
      successfulRecords: etlResult.stats.successful,
      failedRecords: etlResult.stats.failed,
      duplicatesDetected: etlResult.stats.duplicatesRemoved,
      transformedData: etlResult.processed,
      errors: etlResult.errors,
    };
  } catch (error) {
    console.error("[ETLService] Error executing ETL job:", error);
    await logActivity(userId, "data_migration", {
      resourceType: "etl_job",
      description: `ETL job failed: ${error}`,
      httpStatus: 500,
      errorDetails: String(error),
    });

    throw error;
  }
}

/**
 * Get ETL job by ID
 */
export async function getETLJob(jobId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(dataMigrationJobs)
    .where(eq(dataMigrationJobs.id, jobId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all ETL jobs for a user
 */
export async function getUserETLJobs(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(dataMigrationJobs)
    .where(eq(dataMigrationJobs.userId, userId));
}

/**
 * Retry failed ETL job
 */
export async function retryETLJob(userId: number, jobId: number): Promise<ETLJobResult> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }

    // Get original job
    const job = await getETLJob(jobId);
    if (!job || job.userId !== userId) {
      throw new Error("Job not found");
    }

    if (!job.csvData) {
      throw new Error("Original CSV data not found");
    }

    // Re-execute with same configuration
    const config: ETLJobConfig = {
      jobName: `${job.jobName}_retry`,
      entityType: job.entityType as any,
      targetSystem: job.targetSystem as any,
      csvContent: job.csvData,
    };

    return await createAndExecuteETLJob(userId, config);
  } catch (error) {
    console.error("[ETLService] Error retrying ETL job:", error);
    throw error;
  }
}

/**
 * Get ETL job statistics
 */
export async function getETLJobStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const jobs = await db
    .select()
    .from(dataMigrationJobs)
    .where(eq(dataMigrationJobs.userId, userId));

  const stats = {
    totalJobs: jobs.length,
    completedJobs: jobs.filter((j) => j.status === "completed").length,
    failedJobs: jobs.filter((j) => j.status === "failed").length,
    processingJobs: jobs.filter((j) => j.status === "processing").length,
    totalRecordsProcessed: jobs.reduce((sum, j) => sum + (j.processedRecords || 0), 0),
    totalRecordsFailed: jobs.reduce((sum, j) => sum + (j.failedRecords || 0), 0),
    totalDuplicatesDetected: jobs.reduce((sum, j) => sum + (j.duplicatesDetected || 0), 0),
  };

  return stats;
}
