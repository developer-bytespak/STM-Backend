/**
 * Generate a SEO-friendly slug for a provider
 * Format: "business-name-{id}" (e.g., "joes-plumbing-11")
 */
export function generateProviderSlug(businessName: string, providerId: number): string {
  if (!businessName) {
    return `provider-${providerId}`;
  }

  // Convert to lowercase and replace spaces/special chars with hyphens
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  return `${slug}-${providerId}`;
}

/**
 * Extract provider ID from slug
 * Slug format: "business-name-{id}" (e.g., "joes-plumbing-11")
 * Returns the ID or null if invalid
 */
export function extractProviderIdFromSlug(slug: string): number | null {
  if (!slug) return null;

  // Extract the last segment after the final hyphen
  const parts = slug.split('-');
  const lastPart = parts[parts.length - 1];

  // Check if last part is a number
  const id = parseInt(lastPart, 10);
  if (isNaN(id)) {
    return null;
  }

  return id;
}

/**
 * Verify that a slug matches the provider's business name and ID
 * Returns true if valid, false otherwise
 */
export function verifyProviderSlug(
  slug: string,
  businessName: string,
  providerId: number,
): boolean {
  // Extract ID from slug
  const extractedId = extractProviderIdFromSlug(slug);
  
  if (extractedId !== providerId) {
    return false;
  }

  // Generate expected slug from business name
  const expectedSlug = generateProviderSlug(businessName, providerId);
  
  // Compare slugs (case-insensitive)
  return slug.toLowerCase() === expectedSlug.toLowerCase();
}

