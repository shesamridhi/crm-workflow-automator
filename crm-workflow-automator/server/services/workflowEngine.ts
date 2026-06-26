import { getDb, logActivity } from "../db";
import { workflowRules, webhookEvents } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { executeBidirectionalSync, executeUnidirectionalSync } from "./syncEngine";

export interface WorkflowTrigger {
  eventType: string;
  source: "hubspot" | "salesforce" | "manual";
  payload: Record<string, any>;
}

export interface WorkflowExecutionResult {
  success: boolean;
  ruleId: number;
  ruleName: string;
  matchedConditions: boolean;
  actionExecuted: boolean;
  actionResult?: any;
  error?: string;
}

/**
 * Evaluate workflow trigger condition
 */
export function evaluateCondition(
  payload: Record<string, any>,
  condition: Record<string, any>
): boolean {
  const { field, operator, value } = condition;

  if (!field || !operator) return false;

  const fieldValue = payload[field];

  switch (operator) {
    case "equals":
      return fieldValue === value;
    case "not_equals":
      return fieldValue !== value;
    case "contains":
      return typeof fieldValue === "string" && fieldValue.includes(value);
    case "not_contains":
      return typeof fieldValue === "string" && !fieldValue.includes(value);
    case "greater_than":
      return fieldValue > value;
    case "less_than":
      return fieldValue < value;
    case "exists":
      return fieldValue !== null && fieldValue !== undefined;
    case "not_exists":
      return fieldValue === null || fieldValue === undefined;
    default:
      return false;
  }
}

/**
 * Execute workflow action
 */
export async function executeWorkflowAction(
  userId: number,
  action: string,
  actionPayload: Record<string, any> | null,
  triggerPayload: Record<string, any>
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    switch (action) {
      case "sync_to_salesforce":
        return await executeSyncAction(userId, "hubspot", "salesforce", triggerPayload);

      case "sync_to_hubspot":
        return await executeSyncAction(userId, "salesforce", "hubspot", triggerPayload);

      case "create_contact":
        return await createContactAction(userId, actionPayload || {});

      case "update_contact":
        return await updateContactAction(userId, actionPayload || {});

      case "notify_user":
        return await notifyUserAction(userId, actionPayload || {});

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  } catch (error) {
    console.error("[WorkflowEngine] Error executing action:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Execute sync action
 */
async function executeSyncAction(
  userId: number,
  sourceSystem: "hubspot" | "salesforce",
  targetSystem: "hubspot" | "salesforce",
  payload: Record<string, any>
) {
  try {
    const syncPayload = {
      entityType: payload.entityType || "contact",
      entityId: payload.entityId || `entity_${Date.now()}`,
      data: payload,
    };

    const result = await executeBidirectionalSync(
      userId,
      sourceSystem,
      targetSystem,
      syncPayload as any
    );

    return {
      success: result.success,
      result: {
        recordsProcessed: result.recordsProcessed,
        recordsSucceeded: result.recordsSucceeded,
        recordsFailed: result.recordsFailed,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Create contact action
 */
async function createContactAction(userId: number, payload: Record<string, any>) {
  try {
    // Simulate contact creation
    const contactId = `contact_${Date.now()}`;
    await logActivity(userId, "sync_completed", {
      resourceType: "contact",
      resourceId: contactId,
      description: "Contact created via workflow",
      httpStatus: 201,
      httpMethod: "POST",
      endpoint: "/api/contacts",
      requestPayload: JSON.stringify(payload),
    });

    return {
      success: true,
      result: { contactId, ...payload },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Update contact action
 */
async function updateContactAction(userId: number, payload: Record<string, any>) {
  try {
    const contactId = payload.contactId || "unknown";
    await logActivity(userId, "sync_completed", {
      resourceType: "contact",
      resourceId: contactId,
      description: "Contact updated via workflow",
      httpStatus: 200,
      httpMethod: "PUT",
      endpoint: `/api/contacts/${contactId}`,
      requestPayload: JSON.stringify(payload),
    });

    return {
      success: true,
      result: { contactId, ...payload },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Notify user action
 */
async function notifyUserAction(userId: number, payload: Record<string, any>) {
  try {
    await logActivity(userId, "webhook_processed", {
      resourceType: "notification",
      description: payload.message || "Workflow notification sent",
      httpStatus: 200,
      requestPayload: JSON.stringify(payload),
    });

    return {
      success: true,
      result: { notified: true, message: payload.message },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Process webhook event and trigger matching workflows
 */
export async function processWebhookEvent(
  userId: number,
  trigger: WorkflowTrigger
): Promise<WorkflowExecutionResult[]> {
  try {
    const db = await getDb();
    if (!db) {
      return [];
    }

    // Store webhook event
    const webhookRecord = await db.insert(webhookEvents).values({
      userId,
      eventType: trigger.eventType,
      source: trigger.source,
      payload: JSON.stringify(trigger.payload),
      status: "processing",
    });

    const webhookId = (webhookRecord as any).insertId || 1;

    // Get all active workflow rules for this user
    const rules = await db
      .select()
      .from(workflowRules)
      .where(
        and(
          eq(workflowRules.userId, userId),
          eq(workflowRules.isActive, true)
        )
      );

    const results: WorkflowExecutionResult[] = [];
    const matchedRuleIds: number[] = [];

    for (const rule of rules) {
      // Check if trigger event matches
      if (rule.triggerEvent !== trigger.eventType) {
        continue;
      }

      // Evaluate trigger condition
      const triggerCondition = rule.triggerCondition as Record<string, any>;
      const conditionMatched = evaluateCondition(trigger.payload, triggerCondition);

      if (!conditionMatched) {
        continue;
      }

      matchedRuleIds.push(rule.id);

      // Execute workflow action
      const actionResult = await executeWorkflowAction(
        userId,
        rule.action,
        rule.actionPayload as Record<string, any> | null,
        trigger.payload
      );

      // Update rule execution count
      await db
        .update(workflowRules)
        .set({
          executionCount: rule.executionCount + 1,
          lastExecutedAt: new Date(),
        })
        .where(eq(workflowRules.id, rule.id));

      results.push({
        success: actionResult.success,
        ruleId: rule.id,
        ruleName: rule.ruleName,
        matchedConditions: true,
        actionExecuted: actionResult.success,
        actionResult: actionResult.result,
        error: actionResult.error,
      });

      // Log workflow trigger
      await logActivity(userId, "workflow_triggered", {
        resourceType: "workflow",
        resourceId: String(rule.id),
        description: `Workflow "${rule.ruleName}" triggered`,
        httpStatus: actionResult.success ? 200 : 500,
        requestPayload: JSON.stringify(trigger.payload),
        responsePayload: JSON.stringify(actionResult.result),
        errorDetails: actionResult.error,
      });
    }

    // Update webhook event status
    await db
      .update(webhookEvents)
      .set({
        status: results.length > 0 && results.every((r) => r.success) ? "processed" : "processed",
        processedAt: new Date(),
        matchedRules: JSON.stringify(matchedRuleIds),
      })
      .where(eq(webhookEvents.id, webhookId as number));

    return results;
  } catch (error) {
    console.error("[WorkflowEngine] Error processing webhook:", error);
    await logActivity(userId, "webhook_failed", {
      resourceType: "webhook",
      description: "Webhook processing failed",
      httpStatus: 500,
      errorDetails: String(error),
    });
    return [];
  }
}

/**
 * Simulate webhook trigger for testing
 */
export async function simulateWebhookTrigger(
  userId: number,
  eventType: string,
  payload: Record<string, any>
): Promise<WorkflowExecutionResult[]> {
  const trigger: WorkflowTrigger = {
    eventType,
    source: "manual",
    payload,
  };

  return await processWebhookEvent(userId, trigger);
}

/**
 * Get workflow rules for a user
 */
export async function getUserWorkflowRules(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(workflowRules)
    .where(eq(workflowRules.userId, userId));
}
