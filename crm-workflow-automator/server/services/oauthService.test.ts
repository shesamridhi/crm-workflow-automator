import { describe, it, expect, beforeEach } from "vitest";
import {
  simulateOAuthFlow,
  disconnectCRM,
  verifyToken,
  refreshOAuthToken,
  generateMockTokens,
} from "./oauthService";

describe("OAuth Service", () => {
  const userId = 1;
  const testClientId = "test-client-id";
  const testClientSecret = "test-client-secret";

  describe("generateMockTokens", () => {
    it("should generate tokens for HubSpot", () => {
      const tokens = generateMockTokens("hubspot");

      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(3600);
      expect(tokens.tokenType).toBe("Bearer");
      expect(tokens.scope).toContain("crm.objects");
    });

    it("should generate tokens for Salesforce", () => {
      const tokens = generateMockTokens("salesforce");

      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(3600);
      expect(tokens.tokenType).toBe("Bearer");
      expect(tokens.scope).toBe("api full");
    });

    it("should generate unique tokens each time", () => {
      const tokens1 = generateMockTokens("hubspot");
      const tokens2 = generateMockTokens("hubspot");

      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });
  });

  describe("simulateOAuthFlow", () => {
    it("should successfully simulate OAuth flow for HubSpot", async () => {
      const result = await simulateOAuthFlow(userId, "hubspot", testClientId, testClientSecret);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(result.tokens?.accessToken).toBeDefined();
      expect(result.tokens?.refreshToken).toBeDefined();
      expect(result.tokens?.expiresIn).toBe(3600);
      expect(result.tokens?.tokenType).toBe("Bearer");
    });

    it("should successfully simulate OAuth flow for Salesforce", async () => {
      const result = await simulateOAuthFlow(
        userId + 1,
        "salesforce",
        testClientId,
        testClientSecret
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(result.tokens?.accessToken).toBeDefined();
      expect(result.tokens?.refreshToken).toBeDefined();
    });

    it("should generate unique tokens for each call", async () => {
      const result1 = await simulateOAuthFlow(userId + 2, "hubspot", testClientId, testClientSecret);
      const result2 = await simulateOAuthFlow(userId + 3, "hubspot", testClientId, testClientSecret);

      expect(result1.tokens?.accessToken).not.toBe(result2.tokens?.accessToken);
      expect(result1.tokens?.refreshToken).not.toBe(result2.tokens?.refreshToken);
    });

    it("should update existing connection if already connected", async () => {
      const testUserId = userId + 4;

      // First connection
      const result1 = await simulateOAuthFlow(testUserId, "hubspot", testClientId, testClientSecret);
      expect(result1.success).toBe(true);

      // Second connection (should update)
      const result2 = await simulateOAuthFlow(testUserId, "hubspot", testClientId, testClientSecret);
      expect(result2.success).toBe(true);

      // Tokens should be different
      expect(result1.tokens?.accessToken).not.toBe(result2.tokens?.accessToken);
    });
  });

  describe("verifyToken", () => {
    it("should verify a valid token", async () => {
      const testUserId = userId + 5;

      // First, establish a connection
      await simulateOAuthFlow(testUserId, "hubspot", testClientId, testClientSecret);

      // Then verify the token
      const result = await verifyToken(testUserId, "hubspot");

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it("should return invalid for non-existent connection", async () => {
      const result = await verifyToken(userId + 999, "hubspot");

      expect(result.valid).toBe(false);
    });
  });

  describe("refreshOAuthToken", () => {
    it("should refresh an expired token", async () => {
      const testUserId = userId + 6;

      // First, establish a connection
      const initial = await simulateOAuthFlow(testUserId, "hubspot", testClientId, testClientSecret);

      // Then refresh the token
      const refreshed = await refreshOAuthToken(testUserId, "hubspot");

      expect(refreshed).toBeDefined();
      expect(refreshed.success).toBe(true);
      expect(refreshed.tokens).toBeDefined();
      expect(refreshed.tokens?.accessToken).toBeDefined();
      // New token should be different from old one
      expect(refreshed.tokens?.accessToken).not.toBe(initial.tokens?.accessToken);
    });

    it("should update token expiration on refresh", async () => {
      const testUserId = userId + 7;

      await simulateOAuthFlow(testUserId, "hubspot", testClientId, testClientSecret);

      const refreshed = await refreshOAuthToken(testUserId, "hubspot");

      expect(refreshed.success).toBe(true);
      expect(refreshed.tokens?.expiresIn).toBe(3600);
    });
  });

  describe("disconnectCRM", () => {
    it("should successfully disconnect a CRM", async () => {
      const testUserId = userId + 8;

      // First, establish a connection
      await simulateOAuthFlow(testUserId, "hubspot", testClientId, testClientSecret);

      // Then disconnect
      const result = await disconnectCRM(testUserId, "hubspot");

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should make token invalid after disconnection", async () => {
      const testUserId = userId + 9;

      // Connect
      await simulateOAuthFlow(testUserId, "hubspot", testClientId, testClientSecret);

      // Disconnect
      await disconnectCRM(testUserId, "hubspot");

      // Verify token is now invalid
      const verification = await verifyToken(testUserId, "hubspot");
      expect(verification.valid).toBe(false);
    });
  });
});
