/**
 * KK Shop Content Studio - Log & Secret Redaction Utility
 * Ensures secrets, access tokens, API keys, and authorization headers
 * are never written to logs, stored in audit trails, or sent to clients.
 */

const SENSITIVE_KEY_PATTERNS = [
  /access_?token/i,
  /auth(orization)?/i,
  /api_?key/i,
  /secret/i,
  /password/i,
  /private_?key/i,
  /bearer/i,
  /channel_?access/i,
  /token/i,
];

const SENSITIVE_VALUE_PATTERNS = [
  /(?:Bearer\s+)[a-zA-Z0-9_\-\.]{20,}/gi,
  /(?:EAAB|EAAC|EAAD|EAAE)[a-zA-Z0-9]{20,}/g, // Facebook Graph API tokens
  /(?:AIza)[a-zA-Z0-9_\-]{35}/g, // Google API keys
  /(?:sk-[a-zA-Z0-9_\-]{20,})/g, // OpenAI API keys
];

/**
 * Masks LINE userId to prevent exposing full user identifiers in logs and UI.
 * e.g. U1234567890abcdef -> U1234••••••••cdef
 */
export function maskUserId(userId?: string | null): string {
  if (!userId || typeof userId !== 'string') return '';
  const trimmed = userId.trim();
  if (trimmed.length <= 8) return '••••••••';
  const prefix = trimmed.slice(0, 5);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Redacts known sensitive strings in text.
 */
export function redactString(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let sanitized = text;
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
  }
  return sanitized;
}

/**
 * Recursively redacts sensitive keys and values from objects.
 */
export function redactObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return redactString(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
      if (isSensitiveKey) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = redactObject(value);
      } else if (typeof value === 'string') {
        sanitized[key] = redactString(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized as T;
  }

  return obj;
}

/**
 * Safe logger that redacts sensitive values before outputting.
 */
export const safeLogger = {
  info: (msg: string, ...args: any[]) => {
    console.log(redactString(msg), ...args.map(a => redactObject(a)));
  },
  warn: (msg: string, ...args: any[]) => {
    console.warn(redactString(msg), ...args.map(a => redactObject(a)));
  },
  error: (msg: string, ...args: any[]) => {
    console.error(redactString(msg), ...args.map(a => redactObject(a)));
  },
};
