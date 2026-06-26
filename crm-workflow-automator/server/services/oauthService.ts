import crypto from "crypto";
import { getDb, logActivity } from "../db";
import { crmConnections } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Mock OAuth token structure
 */
export interface OAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

/**
 * Generate mock OAuth tokens
 */
export function generateMockTokens(crmType: "hubspot" | "salesforce"): OAuthToken {
  const accessToken = crypto.randomBytes(32).toString("hex");
  const refreshToken = crypto.randomBytes(32).toString("hex");

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600, // 1 hour
    tokenType: "Bearer",
    scope: crmType === "hubspot" ? "crm.objects.contacts.read crm.objects.deals.read" : "api full",
  };
}

/**
 * Simulate OAuth 2.0 authorization flow
 */
export async function simulateOAuthFlow(
  userId: number,
  crmType: "hubspot" | "salesforce",
  clientId: string,
  clientSecret: string
): Promise<{ success: boolean; tokens?: OAuthToken; error?: string }> {
  try {
    const tokens = generateMockTokens(crmType);
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database connection failed" };
    }

    // Check if connection exists
    const existing = await db
      .select()
      .from(crmConnections)
      .where(
        and(
          eq(crmConnections.userId, userId),
          eq(crmConnections.crmType, crmType)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing connection
      await db
        .update(crmConnections)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: expiresAt,
          isConnected: true,
          updatedAt: new Date(),
        })
        .where(eq(crmConnections.id, existing[0].id));
    } else {
      // Create new connection
      await db.insert(crmConnections).values({
        userId,
        crmType,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: expiresAt,
        clientId,
        clientSecret,
        isConnected: true,
      });
    }

    // Log activity
    await logActivity(userId, "oauth_connect", {
      description: `Connected to ${crmType}`,
      resourceType: "crm_connection",
      resourceId: crmType,
    });

    return { success: true, tokens };
  } catch (error) {
    console.error("[OAuth] Error during OAuth flow:", error);
    return { success: false, error: "OAuth flow failed" };
  }
}

/**
 * Simulate token refresh
 */
export async function refreshOAuthToken(
  userId: number,
  crmType: "hubspot" | "salesforce"
): Promise<{ success: boolean; tokens?: OAuthToken; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database connection failed" };
    }

    const connection = await db
      .select()
      .from(crmConnections)
      .where(
        and(
          eq(crmConnections.userId, userId),
          eq(crmConnections.crmType, crmType)
        )
      )
      .limit(1);

    if (!connection.length) {
      return { success: false, error: "CRM connection not found" };
    }

    const tokens = generateMockTokens(crmType);
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    await db
      .update(crmConnections)
      .set({
        accessToken: tokens.accessToken,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(crmConnections.id, connection[0].id));

    await logActivity(userId, "oauth_connect", {
      description: `Refreshed ${crmType} token`,
      resourceType: "crm_connection",
      resourceId: crmType,
    });

    return { success: true, tokens };
  } catch (error) {
    console.error("[OAuth] Error during token refresh:", error);
    return { success: false, error: "Token refresh failed" };
  }
}

/**
 * Disconnect CRM connection
 */
export async function disconnectCRM(
  userId: number,
  crmType: "hubspot" | "salesforce"
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database connection failed" };
    }

    const result = await db
      .update(crmConnections)
      .set({
        isConnected: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(crmConnections.userId, userId),
          eq(crmConnections.crmType, crmType)
        )
      );

    await logActivity(userId, "oauth_disconnect", {
      description: `Disconnected from ${crmType}`,
      resourceType: "crm_connection",
      resourceId: crmType,
    });

    return { success: true };
  } catch (error) {
    console.error("[OAuth] Error during disconnect:", error);
    return { success: false, error: "Disconnect failed" };
  }
}

/**
 * Verify token validity
 */
export async function verifyToken(
  userId: number,
  crmType: "hubspot" | "salesforce"
): Promise<{ valid: boolean; expiresIn?: number }> {
  try {
    const db = await getDb();
    if (!db) {
      return { valid: false };
    }

    const connection = await db
      .select()
      .from(crmConnections)
      .where(
        and(
          eq(crmConnections.userId, userId),
          eq(crmConnections.crmType, crmType)
        )
      )
      .limit(1);

    if (!connection.length || !connection[0].isConnected) {
      return { valid: false };
    }

    const tokenExpiresAt = connection[0].tokenExpiresAt;
    if (!tokenExpiresAt) {
      return { valid: true };
    }

    const now = new Date();
    if (tokenExpiresAt <= now) {
      // Token expired, try to refresh
      const refreshResult = await refreshOAuthToken(userId, crmType);
      return { valid: refreshResult.success };
    }

    const expiresIn = Math.floor((tokenExpiresAt.getTime() - now.getTime()) / 1000);
    return { valid: true, expiresIn };
  } catch (error) {
    console.error("[OAuth] Error during token verification:", error);
    return { valid: false };
  }
}
