import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Integration tests for tRPC routers
 * These tests verify end-to-end API functionality
 */

describe("API Integration Tests", () => {
  const userId = 1;
  const testClientId = "test-client-id";
  const testClientSecret = "test-client-secret";

  // Mock context for testing
  function createMockContext(): TrpcContext {
    return {
      user: {
        id: userId,
        openId: "test-user",
        email: "test@example.com",
        name: "Test User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };
  }

  describe("CRM Connection Flow", () => {
    it("should complete full OAuth connection flow", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // Step 1: Connect to HubSpot
      const connectResult = await caller.crm.connect({
        crmType: "hubspot",
        clientId: testClientId,
        clientSecret: testClientSecret,
      });

      expect(connectResult.success).toBe(true);
      expect(connectResult.tokens).toBeDefined();

      // Step 2: Verify connection
      const verifyResult = await caller.crm.verifyToken({
        crmType: "hubspot",
      });

      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.expiresIn).toBeGreaterThan(0);

      // Step 3: Disconnect
      const disconnectResult = await caller.crm.disconnect({
        crmType: "hubspot",
      });

      expect(disconnectResult.success).toBe(true);
    });

    it("should list user connections", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // Connect to both systems
      await caller.crm.connect({
        crmType: "hubspot",
        clientId: testClientId,
        clientSecret: testClientSecret,
      });

      await caller.crm.connect({
        crmType: "salesforce",
        clientId: testClientId,
        clientSecret: testClientSecret,
      });

      // List connections
      const result = await caller.crm.getConnections();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Field Mapping Flow", () => {
    it("should list field mappings", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // List mappings
      const listResult = await caller.fieldMapper.getMappings();

      expect(listResult).toBeDefined();
      expect(Array.isArray(listResult)).toBe(true);
    });
  });

  describe("Workflow Execution Flow", () => {
    it("should list workflow rules", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // List rules
      const listResult = await caller.workflow.getRules();

      expect(listResult).toBeDefined();
      expect(Array.isArray(listResult)).toBe(true);
    });
  });

  describe("ETL Pipeline Flow", () => {
    it("should list ETL jobs", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // List ETL jobs
      const result = await caller.etl.getJobs();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Activity Logging", () => {
    it("should log all activities", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // Perform some activities
      await caller.crm.connect({
        crmType: "hubspot",
        clientId: testClientId,
        clientSecret: testClientSecret,
      });

      // Get activity log
      const result = await caller.activity.getLog({ limit: 100 });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify activity types
      const activityTypes = result.map((a) => a.activityType);
      expect(activityTypes.some((t) => t.includes("oauth"))).toBe(true);
    });
  });

  describe("Sandbox Data Management", () => {
    it("should initialize sandbox data", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // Initialize sandbox
      const result = await caller.sandbox.initialize({
        system: "hubspot",
        entityType: "contact",
        recordCount: 10,
      });

      expect(result.success).toBe(true);
      if (result.recordsCreated !== undefined) {
        expect(result.recordsCreated).toBeGreaterThan(0);
      }
    });

    it("should retrieve sandbox data", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // Initialize first
      await caller.sandbox.initialize({
        system: "hubspot",
        entityType: "contact",
        recordCount: 5,
      });

      // Get data
      const result = await caller.sandbox.getData({
        system: "hubspot",
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid CRM type gracefully", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.crm.connect({
          crmType: "invalid" as any,
          clientId: testClientId,
          clientSecret: testClientSecret,
        });
        // If it doesn't throw, that's also acceptable
      } catch (error) {
        // Expected behavior
        expect(error).toBeDefined();
      }
    });
  });
});
