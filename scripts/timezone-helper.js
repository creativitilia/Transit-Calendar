// ============================================
// TIMEZONE HELPER
// Convert local birth time to UTC
// ============================================

/**
 * Estimate timezone offset from coordinates using a simple lookup
 * In production, use a proper timezone database like moment-timezone
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {number} Estimated timezone offset in hours
 */
export function estimateTimezoneOffset(lat, lon) {
  // Very rough approximation:  15° longitude ≈ 1 hour
  // This is NOT accurate for real-world use (doesn't account for DST, political boundaries, etc.)
  const roughOffset = Math.round(lon / 15);
  
  console.warn('⚠️ Using estimated timezone offset.  For production, use a proper timezone library.');
  return roughOffset;
}

/**
 * Get timezone offset manually from user
 * Returns a promise that resolves with the offset
 */
export function promptForTimezoneOffset(birthPlace) {
  return new Promise((resolve) => {
    const offset = prompt(
      `What is the timezone offset for ${birthPlace}?\n\n` +
      `Examples:\n` +
      `  • New York (EST): -5\n` +
      `  • London (GMT): 0\n` +
      `  • Tokyo (JST): +9\n` +
      `  • Los Angeles (PST): -8\n` +
      `  • Paris (CET): +1\n` +
      `  • Sydney (AEST): +10\n\n` +
      `Enter the offset from UTC (e.g., -5 or +9):`,
      '0'
    );
    
    const parsedOffset = parseFloat(offset) || 0;
    resolve(parsedOffset);
  });
}

/**
 * Better approach: Use Intl API to get browser's timezone
 * Then ask user to confirm if it matches birth location
 */
export function getBrowserTimezone() {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`🌍 Browser timezone: ${timezone}`);
    return timezone;
  } catch (e) {
    console.error('Could not detect timezone');
    return 'UTC';
  }
}

/**
 * Get timezone offset for a specific location (requires external API or library)
 * This is a placeholder - in production, use Google Timezone API or similar
 */
export async function getTimezoneForLocation(lat, lon, timestamp) {
  console.warn('⚠️ getTimezoneForLocation requires an external API.');
  console.warn('Consider using Google Timezone API or a library like moment-timezone');
  
  // Placeholder:  return estimated offset
  return estimateTimezoneOffset(lat, lon);
}

console.log('🌍 Timezone Helper module loaded!');