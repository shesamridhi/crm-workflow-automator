import crypto from "crypto";

/**
 * Generate SHA-256 hash of email for deduplication
 */
export function generateEmailHash(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

/**
 * Normalize phone number to E.164 format
 * E.164 format: +[country code][number]
 * Example: +14155552671
 */
export function normalizePhoneE164(phone: string, defaultCountryCode: string = "1"): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Remove leading zeros after +
  if (cleaned.startsWith("+")) {
    cleaned = "+" + cleaned.substring(1).replace(/^0+/, "");
  } else {
    cleaned = cleaned.replace(/^0+/, "");
  }

  // If no + prefix, assume it's missing country code
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + defaultCountryCode + cleaned;
  }

  // Validate E.164 format: + followed by 1-15 digits
  if (!/^\+\d{1,15}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Clean and trim data fields
 */
export function cleanData(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      cleaned[key] = value.trim();
    } else if (value === null || value === undefined) {
      cleaned[key] = null;
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Transform date formats to ISO 8601
 */
export function transformDateToISO(dateStr: string | Date): string | null {
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Apply field mapping transformation to a data object
 */
export function applyFieldMapping(
  sourceData: Record<string, any>,
  mappingConfig: Record<string, string>
): Record<string, any> {
  const transformed: Record<string, any> = {};

  for (const [sourceField, targetField] of Object.entries(mappingConfig)) {
    if (sourceField in sourceData) {
      transformed[targetField] = sourceData[sourceField];
    }
  }

  return transformed;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Deduplicate records based on email hash
 */
export function deduplicateByEmailHash(
  records: Record<string, any>[],
  emailField: string = "email"
): { unique: Record<string, any>[]; duplicates: Record<string, any>[] } {
  const emailHashes = new Set<string>();
  const unique: Record<string, any>[] = [];
  const duplicates: Record<string, any>[] = [];

  for (const record of records) {
    const email = record[emailField];
    if (!email) {
      unique.push(record);
      continue;
    }

    const hash = generateEmailHash(email);
    if (emailHashes.has(hash)) {
      duplicates.push(record);
    } else {
      emailHashes.add(hash);
      unique.push(record);
    }
  }

  return { unique, duplicates };
}

/**
 * Parse CSV string to array of objects
 */
export function parseCSV(csvContent: string): Record<string, any>[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const records: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const record: Record<string, any> = {};

    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j] || null;
    }

    records.push(record);
  }

  return records;
}

/**
 * Transform and clean ETL pipeline
 */
export function runETLPipeline(
  records: Record<string, any>[],
  options: {
    cleanData?: boolean;
    normalizePhones?: boolean;
    normalizeEmails?: boolean;
    deduplicateByEmail?: boolean;
    phoneField?: string;
    emailField?: string;
  } = {}
): {
  processed: Record<string, any>[];
  errors: Array<{ recordIndex: number; error: string }>;
  stats: {
    total: number;
    successful: number;
    failed: number;
    duplicatesRemoved: number;
  };
} {
  const {
    cleanData: shouldClean = true,
    normalizePhones = true,
    normalizeEmails = true,
    deduplicateByEmail = true,
    phoneField = "phone",
    emailField = "email",
  } = options;

  const errors: Array<{ recordIndex: number; error: string }> = [];
  let processed: Record<string, any>[] = [];
  let duplicatesRemoved = 0;

  // Step 1: Clean data
  if (shouldClean) {
    processed = records.map((record) => cleanData(record));
  } else {
    processed = [...records];
  }

  // Step 2: Normalize phones
  if (normalizePhones) {
    processed = processed.map((record, idx) => {
      if (record[phoneField]) {
        const normalized = normalizePhoneE164(record[phoneField]);
        if (normalized) {
          record[phoneField] = normalized;
        } else {
          errors.push({ recordIndex: idx, error: `Invalid phone format: ${record[phoneField]}` });
        }
      }
      return record;
    });
  }

  // Step 3: Normalize emails
  if (normalizeEmails) {
    processed = processed.map((record) => {
      if (record[emailField]) {
        if (!isValidEmail(record[emailField])) {
          record[emailField] = null;
        } else {
          record[emailField] = record[emailField].toLowerCase().trim();
        }
      }
      return record;
    });
  }

  // Step 4: Deduplicate by email
  if (deduplicateByEmail) {
    const { unique, duplicates } = deduplicateByEmailHash(processed, emailField);
    duplicatesRemoved = duplicates.length;
    processed = unique;
  }

  return {
    processed,
    errors,
    stats: {
      total: records.length,
      successful: processed.length,
      failed: errors.length,
      duplicatesRemoved,
    },
  };
}

/**
 * Validate ETL pipeline result
 */
export function validateETLResult(data: Record<string, any>[]): boolean {
  return Array.isArray(data) && data.every((record) => typeof record === "object" && record !== null);
}
