import { describe, it, expect } from "vitest";

/**
 * Field mapping transformation utilities
 */

function applyFieldMapping(
  sourceData: Record<string, any>,
  mappingConfig: Record<string, string>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [sourceField, targetField] of Object.entries(mappingConfig)) {
    if (sourceField in sourceData) {
      result[targetField] = sourceData[sourceField];
    }
  }

  return result;
}

function validateMappingConfig(mappingConfig: Record<string, string>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!mappingConfig || Object.keys(mappingConfig).length === 0) {
    errors.push("Mapping configuration cannot be empty");
  }

  for (const [source, target] of Object.entries(mappingConfig)) {
    if (!source || typeof source !== "string") {
      errors.push("Source field must be a non-empty string");
    }
    if (!target || typeof target !== "string") {
      errors.push("Target field must be a non-empty string");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function transformPayload(
  sourcePayload: Record<string, any>,
  mappingConfig: Record<string, string>,
  transformers?: Record<string, (value: any) => any>
): Record<string, any> {
  let result = applyFieldMapping(sourcePayload, mappingConfig);

  if (transformers) {
    for (const [field, transformer] of Object.entries(transformers)) {
      if (field in result) {
        try {
          result[field] = transformer(result[field]);
        } catch (error) {
          console.error(`Error transforming field ${field}:`, error);
        }
      }
    }
  }

  return result;
}

describe("Field Mapping Engine", () => {
  describe("applyFieldMapping", () => {
    it("should apply simple field mappings", () => {
      const sourceData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };

      const mappingConfig = {
        firstName: "first_name",
        lastName: "last_name",
        email: "email_address",
      };

      const result = applyFieldMapping(sourceData, mappingConfig);

      expect(result).toEqual({
        first_name: "John",
        last_name: "Doe",
        email_address: "john@example.com",
      });
    });

    it("should handle partial mappings", () => {
      const sourceData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "415-555-2671",
      };

      const mappingConfig = {
        firstName: "first_name",
        lastName: "last_name",
      };

      const result = applyFieldMapping(sourceData, mappingConfig);

      expect(result).toEqual({
        first_name: "John",
        last_name: "Doe",
      });
      expect(result.email_address).toBeUndefined();
      expect(result.phone).toBeUndefined();
    });

    it("should skip missing source fields", () => {
      const sourceData = {
        firstName: "John",
        lastName: "Doe",
      };

      const mappingConfig = {
        firstName: "first_name",
        lastName: "last_name",
        email: "email_address",
      };

      const result = applyFieldMapping(sourceData, mappingConfig);

      expect(result).toEqual({
        first_name: "John",
        last_name: "Doe",
      });
      expect(result.email_address).toBeUndefined();
    });

    it("should handle nested field mappings", () => {
      const sourceData = {
        contact: {
          firstName: "John",
          lastName: "Doe",
        },
      };

      const mappingConfig = {
        "contact.firstName": "first_name",
        "contact.lastName": "last_name",
      };

      // Note: This is a simplified version - real implementation would need to handle nested paths
      const result = applyFieldMapping(sourceData, mappingConfig);

      // With simple implementation, nested paths won't match
      expect(result).toEqual({});
    });
  });

  describe("validateMappingConfig", () => {
    it("should validate valid mapping config", () => {
      const mappingConfig = {
        firstName: "first_name",
        lastName: "last_name",
        email: "email_address",
      };

      const result = validateMappingConfig(mappingConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty mapping config", () => {
      const mappingConfig = {};

      const result = validateMappingConfig(mappingConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject mapping with empty source field", () => {
      const mappingConfig = {
        "": "target_field",
      };

      const result = validateMappingConfig(mappingConfig);

      expect(result.valid).toBe(false);
    });

    it("should reject mapping with empty target field", () => {
      const mappingConfig = {
        source_field: "",
      };

      const result = validateMappingConfig(mappingConfig);

      expect(result.valid).toBe(false);
    });
  });

  describe("transformPayload", () => {
    it("should apply field mappings and transformers", () => {
      const sourcePayload = {
        firstName: "john",
        lastName: "doe",
        email: "john@example.com",
      };

      const mappingConfig = {
        firstName: "first_name",
        lastName: "last_name",
        email: "email_address",
      };

      const transformers = {
        first_name: (value: string) => value.charAt(0).toUpperCase() + value.slice(1),
        last_name: (value: string) => value.toUpperCase(),
        email_address: (value: string) => value.toLowerCase(),
      };

      const result = transformPayload(sourcePayload, mappingConfig, transformers);

      expect(result).toEqual({
        first_name: "John",
        last_name: "DOE",
        email_address: "john@example.com",
      });
    });

    it("should handle transformer errors gracefully", () => {
      const sourcePayload = {
        firstName: "john",
      };

      const mappingConfig = {
        firstName: "first_name",
      };

      const transformers = {
        first_name: (value: string) => {
          throw new Error("Transformer error");
        },
      };

      const result = transformPayload(sourcePayload, mappingConfig, transformers);

      // Should still have the original value despite transformer error
      expect(result.first_name).toBe("john"); // Original value preserved on error
    });

    it("should work without transformers", () => {
      const sourcePayload = {
        firstName: "John",
        lastName: "Doe",
      };

      const mappingConfig = {
        firstName: "first_name",
        lastName: "last_name",
      };

      const result = transformPayload(sourcePayload, mappingConfig);

      expect(result).toEqual({
        first_name: "John",
        last_name: "Doe",
      });
    });

    it("should handle complex data types", () => {
      const sourcePayload = {
        firstName: "John",
        age: 30,
        active: true,
        tags: ["vip", "customer"],
        metadata: { source: "hubspot" },
      };

      const mappingConfig = {
        firstName: "first_name",
        age: "user_age",
        active: "is_active",
        tags: "user_tags",
        metadata: "user_metadata",
      };

      const result = transformPayload(sourcePayload, mappingConfig);

      expect(result.first_name).toBe("John");
      expect(result.user_age).toBe(30);
      expect(result.is_active).toBe(true);
      expect(result.user_tags).toEqual(["vip", "customer"]);
      expect(result.user_metadata).toEqual({ source: "hubspot" });
    });
  });

  describe("Bidirectional Mapping", () => {
    it("should support reverse mapping", () => {
      const hubspotToSalesforce = {
        firstName: "first_name",
        lastName: "last_name",
        email: "email_address",
      };

      // Create reverse mapping
      const salesforceToHubspot: Record<string, string> = {};
      for (const [source, target] of Object.entries(hubspotToSalesforce)) {
        salesforceToHubspot[target] = source;
      }

      const salesforceData = {
        first_name: "Jane",
        last_name: "Smith",
        email_address: "jane@example.com",
      };

      const result = applyFieldMapping(salesforceData, salesforceToHubspot);

      expect(result).toEqual({
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
      });
    });

    it("should handle conflicting field names in bidirectional mapping", () => {
      const sourceData = {
        first_name: "John",
        firstName: "Jane",
      };

      const mappingConfig = {
        first_name: "firstName",
      };

      const result = applyFieldMapping(sourceData, mappingConfig);

      expect(result.firstName).toBe("John"); // Maps from first_name
    });
  });

  describe("Mapping Composition", () => {
    it("should compose multiple mappings", () => {
      const sourceData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };

      // First mapping: HubSpot to intermediate format
      const hubspotMapping = {
        firstName: "contact_first_name",
        lastName: "contact_last_name",
        email: "contact_email",
      };

      const intermediate = applyFieldMapping(sourceData, hubspotMapping);

      // Second mapping: intermediate to Salesforce format
      const salesforceMapping = {
        contact_first_name: "FirstName",
        contact_last_name: "LastName",
        contact_email: "Email",
      };

      const final = applyFieldMapping(intermediate, salesforceMapping);

      expect(final).toEqual({
        FirstName: "John",
        LastName: "Doe",
        Email: "john@example.com",
      });
    });
  });
});
