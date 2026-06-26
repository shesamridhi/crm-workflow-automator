import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  simulateOAuthFlow,
  disconnectCRM,
  verifyToken,
  refreshOAuthToken,
} from "./services/oauthService";
import {
  executeBidirectionalSync,
  executeUnidirectionalSync,
  getSyncHistory,
} from "./services/syncEngine";
import {
  processWebhookEvent,
  simulateWebhookTrigger,
  getUserWorkflowRules,
} from "./services/workflowEngine";
import { createAndExecuteETLJob, getUserETLJobs, getETLJob } from "./services/etlService";
import {
  getCrmConnections,
  getFieldMappings,
  getActivityLog,
  logActivity,
  getWorkflowRules,
  getWebhookEvents,
} from "./db";
import { getDb } from "./db";
import { fieldMappings, workflowRules, sandboxData } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // CRM Connections
  crm: router({
    // Get all CRM connections for the user
    getConnections: protectedProcedure.query(async ({ ctx }) => {
      return await getCrmConnections(ctx.user.id);
    }),

    // Initiate OAuth flow for a CRM
    connect: protectedProcedure
      .input(
        z.object({
          crmType: z.enum(["hubspot", "salesforce"]),
          clientId: z.string(),
          clientSecret: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await simulateOAuthFlow(
          ctx.user.id,
          input.crmType,
          input.clientId,
          input.clientSecret
        );
        return result;
      }),

    // Disconnect a CRM
    disconnect: protectedProcedure
      .input(z.object({ crmType: z.enum(["hubspot", "salesforce"]) }))
      .mutation(async ({ ctx, input }) => {
        return await disconnectCRM(ctx.user.id, input.crmType);
      }),

    // Verify token validity
    verifyToken: protectedProcedure
      .input(z.object({ crmType: z.enum(["hubspot", "salesforce"]) }))
      .query(async ({ ctx, input }) => {
        return await verifyToken(ctx.user.id, input.crmType);
      }),

    // Refresh token
    refreshToken: protectedProcedure
      .input(z.object({ crmType: z.enum(["hubspot", "salesforce"]) }))
      .mutation(async ({ ctx, input }) => {
        return await refreshOAuthToken(ctx.user.id, input.crmType);
      }),
  }),

  // Field Mappings
  fieldMapper: router({
    // Get all field mappings
    getMappings: protectedProcedure.query(async ({ ctx }) => {
      return await getFieldMappings(ctx.user.id);
    }),

    // Create a new field mapping
    createMapping: protectedProcedure
      .input(
        z.object({
          mappingName: z.string(),
          sourceSystem: z.enum(["hubspot", "salesforce"]),
          targetSystem: z.enum(["hubspot", "salesforce"]),
          entityType: z.enum(["contact", "deal", "lead", "opportunity", "pipeline"]),
          mappingConfig: z.record(z.string(), z.any()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        const result = await db.insert(fieldMappings).values({
          userId: ctx.user.id,
          mappingName: input.mappingName,
          sourceSystem: input.sourceSystem,
          targetSystem: input.targetSystem,
          entityType: input.entityType,
          mappingConfig: input.mappingConfig,
          isActive: true,
        });

        await logActivity(ctx.user.id, "field_mapping_created", {
          description: `Created field mapping: ${input.mappingName}`,
          resourceType: "field_mapping",
          resourceId: String((result as any).insertId),
        });

        return { success: true, mappingId: (result as any).insertId };
      }),

    // Update a field mapping
    updateMapping: protectedProcedure
      .input(
        z.object({
          mappingId: z.number(),
          mappingConfig: z.record(z.string(), z.any()),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        await db
          .update(fieldMappings)
          .set({
            mappingConfig: input.mappingConfig,
            isActive: input.isActive,
            updatedAt: new Date(),
          })
          .where(eq(fieldMappings.id, input.mappingId));

        await logActivity(ctx.user.id, "field_mapping_updated", {
          description: `Updated field mapping`,
          resourceType: "field_mapping",
          resourceId: String(input.mappingId),
        });

        return { success: true };
      }),

    // Delete a field mapping
    deleteMapping: protectedProcedure
      .input(z.object({ mappingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        await db
          .delete(fieldMappings)
          .where(eq(fieldMappings.id, input.mappingId));

        await logActivity(ctx.user.id, "field_mapping_deleted", {
          description: `Deleted field mapping`,
          resourceType: "field_mapping",
          resourceId: String(input.mappingId),
        });

        return { success: true };
      }),
  }),

  // Sync Operations
  sync: router({
    // Execute bidirectional sync
    bidirectional: protectedProcedure
      .input(
        z.object({
          sourceSystem: z.enum(["hubspot", "salesforce"]),
          targetSystem: z.enum(["hubspot", "salesforce"]),
          entityType: z.enum(["contact", "deal", "lead", "opportunity", "pipeline"]),
          entityId: z.string(),
          data: z.record(z.string(), z.any()),
          mappingId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await executeBidirectionalSync(
          ctx.user.id,
          input.sourceSystem,
          input.targetSystem,
          {
            entityType: input.entityType,
            entityId: input.entityId,
            data: input.data,
          },
          input.mappingId
        );
      }),

    // Execute unidirectional sync
    unidirectional: protectedProcedure
      .input(
        z.object({
          sourceSystem: z.enum(["hubspot", "salesforce"]),
          targetSystem: z.enum(["hubspot", "salesforce"]),
          entityType: z.enum(["contact", "deal", "lead", "opportunity", "pipeline"]),
          entityId: z.string(),
          data: z.record(z.string(), z.any()),
          mappingId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await executeUnidirectionalSync(
          ctx.user.id,
          input.sourceSystem,
          input.targetSystem,
          {
            entityType: input.entityType,
            entityId: input.entityId,
            data: input.data,
          },
          input.mappingId
        );
      }),

    // Get sync history
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await getSyncHistory(ctx.user.id, input.limit);
      }),
  }),

  // Workflow Management
  workflow: router({
    // Get all workflow rules
    getRules: protectedProcedure.query(async ({ ctx }) => {
      return await getUserWorkflowRules(ctx.user.id);
    }),

    // Create a new workflow rule
    createRule: protectedProcedure
      .input(
        z.object({
          ruleName: z.string(),
          description: z.string().optional(),
          triggerEvent: z.string(),
          triggerCondition: z.record(z.string(), z.any()),
          action: z.string(),
          actionPayload: z.record(z.string(), z.any()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        const result = await db.insert(workflowRules).values({
          userId: ctx.user.id,
          ruleName: input.ruleName,
          description: input.description,
          triggerEvent: input.triggerEvent,
          triggerCondition: input.triggerCondition,
          action: input.action,
          actionPayload: input.actionPayload,
          isActive: true,
        });

        await logActivity(ctx.user.id, "workflow_created", {
          description: `Created workflow rule: ${input.ruleName}`,
          resourceType: "workflow",
          resourceId: String((result as any).insertId),
        });

        return { success: true, ruleId: (result as any).insertId };
      }),

    // Update a workflow rule
    updateRule: protectedProcedure
      .input(
        z.object({
          ruleId: z.number(),
          ruleName: z.string().optional(),
          triggerCondition: z.record(z.string(), z.any()).optional(),
          action: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        const updates: Record<string, any> = { updatedAt: new Date() };
        if (input.ruleName) updates.ruleName = input.ruleName;
        if (input.triggerCondition) updates.triggerCondition = input.triggerCondition;
        if (input.action) updates.action = input.action;
        if (input.isActive !== undefined) updates.isActive = input.isActive;

        await db.update(workflowRules).set(updates).where(eq(workflowRules.id, input.ruleId));

        await logActivity(ctx.user.id, "workflow_updated", {
          description: `Updated workflow rule`,
          resourceType: "workflow",
          resourceId: String(input.ruleId),
        });

        return { success: true };
      }),

    // Delete a workflow rule
    deleteRule: protectedProcedure
      .input(z.object({ ruleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        await db
          .delete(workflowRules)
          .where(eq(workflowRules.id, input.ruleId));

        await logActivity(ctx.user.id, "workflow_deleted", {
          description: `Deleted workflow rule`,
          resourceType: "workflow",
          resourceId: String(input.ruleId),
        });

        return { success: true };
      }),

    // Simulate webhook trigger
    simulateTrigger: protectedProcedure
      .input(
        z.object({
          eventType: z.string(),
          payload: z.record(z.string(), z.any()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await simulateWebhookTrigger(ctx.user.id, input.eventType, input.payload);
      }),
  }),

  // Data Migration (ETL)
  etl: router({
    // Execute ETL job
    execute: protectedProcedure
      .input(
        z.object({
          jobName: z.string(),
          entityType: z.enum(["contact", "deal", "lead", "opportunity"]),
          targetSystem: z.enum(["hubspot", "salesforce"]),
          csvContent: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await createAndExecuteETLJob(ctx.user.id, {
          jobName: input.jobName,
          entityType: input.entityType,
          targetSystem: input.targetSystem,
          csvContent: input.csvContent,
        });
      }),

    // Get all ETL jobs
    getJobs: protectedProcedure.query(async ({ ctx }) => {
      return await getUserETLJobs(ctx.user.id);
    }),

    // Get specific ETL job
    getJob: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getETLJob(input.jobId);
      }),
  }),

  // Activity Logging
  activity: router({
    // Get activity log
    getLog: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await getActivityLog(ctx.user.id, input.limit);
      }),
  }),

  // Webhook Events
  webhook: router({
    // Get webhook events
    getEvents: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await getWebhookEvents(ctx.user.id, input.limit);
      }),

    // Process webhook (for external webhooks)
    process: publicProcedure
      .input(
        z.object({
          userId: z.number(),
          eventType: z.string(),
          payload: z.record(z.string(), z.any()),
        })
      )
      .mutation(async ({ input }) => {
        return await processWebhookEvent(input.userId, {
          eventType: input.eventType,
          source: "manual",
          payload: input.payload,
        });
      }),
  }),

  // Sandbox Data
  sandbox: router({
    // Get sandbox data for a system
    getData: protectedProcedure
      .input(z.object({ system: z.enum(["hubspot", "salesforce"]) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db
          .select()
          .from(sandboxData)
          .where(
            and(
              eq(sandboxData.userId, ctx.user.id),
              eq(sandboxData.system, input.system as "hubspot" | "salesforce")
            )
          );
      }),

    // Initialize sandbox data
    initialize: protectedProcedure
      .input(z.object({ system: z.enum(["hubspot", "salesforce"]) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        // Create mock data
        const mockEntities = generateMockSandboxData(input.system);

        for (const entity of mockEntities) {
          await db.insert(sandboxData).values({
            userId: ctx.user.id,
            system: input.system as "hubspot" | "salesforce",
            entityType: entity.entityType as "contact" | "deal" | "lead" | "opportunity" | "pipeline",
            entityData: entity.data,
            externalId: entity.externalId,
          });
        }

        await logActivity(ctx.user.id, "oauth_connect", {
          description: `Initialized ${input.system} sandbox data`,
          resourceType: "sandbox",
          resourceId: input.system,
        });

        return { success: true, entitiesCreated: mockEntities.length };
      }),
  }),
});

/**
 * Generate mock sandbox data
 */
function generateMockSandboxData(
  system: "hubspot" | "salesforce"
): Array<{ entityType: string; externalId: string; data: Record<string, any> }> {
  const timestamp = Date.now();

  if (system === "hubspot") {
    return [
      {
        entityType: "contact",
        externalId: `contact_${timestamp}_1`,
        data: {
          firstname: "John",
          lastname: "Doe",
          email: "john.doe@example.com",
          phone: "+14155552671",
          lifecyclestage: "customer",
        },
      },
      {
        entityType: "contact",
        externalId: `contact_${timestamp}_2`,
        data: {
          firstname: "Jane",
          lastname: "Smith",
          email: "jane.smith@example.com",
          phone: "+14155552672",
          lifecyclestage: "lead",
        },
      },
      {
        entityType: "deal",
        externalId: `deal_${timestamp}_1`,
        data: {
          dealname: "Enterprise Contract",
          dealstage: "negotiation",
          amount: 50000,
          closedate: new Date().toISOString(),
        },
      },
    ];
  } else {
    return [
      {
        entityType: "lead",
        externalId: `lead_${timestamp}_1`,
        data: {
          FirstName: "John",
          LastName: "Doe",
          Email: "john.doe@example.com",
          Phone: "+14155552671",
          LeadSource: "Web",
        },
      },
      {
        entityType: "lead",
        externalId: `lead_${timestamp}_2`,
        data: {
          FirstName: "Jane",
          LastName: "Smith",
          Email: "jane.smith@example.com",
          Phone: "+14155552672",
          LeadSource: "Campaign",
        },
      },
      {
        entityType: "opportunity",
        externalId: `opp_${timestamp}_1`,
        data: {
          Name: "Enterprise Deal",
          StageName: "Proposal",
          Amount: 50000,
          CloseDate: new Date().toISOString(),
        },
      },
    ];
  }
}

export type AppRouter = typeof appRouter;
