// ============================================
// TIMEZONE HELPER
// Convert local birth time to UTC using TimeZoneDB API
// ============================================

// 🔑 ADD YOUR API KEY HERE
const TIMEZONEDB_API_KEY = 'TNCKE1BZVTQV';  // ← Replace with your actual key

/**
 * Get accurate timezone offset using TimeZoneDB API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} birthDate - YYYY-MM-DD format
 * @param {string} birthTime - HH:MM format
 * @returns {Promise<number>} Timezone offset in hours from UTC
 */
export async function getTimezoneOffset(lat, lon, birthDate, birthTime) {
  try {
    // Convert birth date/time to Unix timestamp (rough estimate for API call)
    const [year, month, day] = birthDate.split('-').map(Number);
    const [hour, minute] = birthTime.split(':').map(Number);
    const timestamp = Math.floor(new Date(year, month - 1, day, hour, minute).getTime() / 1000);
    
    // Call TimeZoneDB API
    const url = `https://api.timezonedb.com/v2.1/get-time-zone? key=${TIMEZONEDB_API_KEY}&format=json&by=position&lat=${lat}&lng=${lon}&time=${timestamp}`;
    
    console.log('🌍 Fetching timezone from API...');
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'OK') {
      const offsetSeconds = data.gmtOffset;
      const offsetHours = offsetSeconds / 3600;
      
      console.log(`✅ Timezone found: ${data.zoneName}`);
      console.log(`   Abbreviation: ${data.abbreviation}`);
      console.log(`   Offset: UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`);
      console.log(`   DST: ${data.dst === 1 ? 'Yes' : 'No'}`);
      
      return offsetHours;
    } else {
      throw new Error(data.message || 'Unknown API error');
    }
    
  } catch (error) {
    console.error('❌ Timezone API error:', error);
    console.warn('⚠️ Falling back to estimated timezone');
    
    // Fallback to rough estimation
    return estimateTimezoneOffset(lat, lon);
  }
}

/**
 * Estimate timezone offset from coordinates (FALLBACK ONLY)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {number} Estimated timezone offset in hours
 */
export function estimateTimezoneOffset(lat, lon) {
  // Very rough approximation: 15° longitude ≈ 1 hour
  const roughOffset = Math. round(lon / 15);
  
  console.warn('⚠️ Using estimated timezone offset.  This may be inaccurate.');
  return roughOffset;
}

/**
 * Get timezone offset manually from user
 */
export function promptForTimezoneOffset(birthPlace) {
  return new Promise((resolve) => {
    const offset = prompt(
      `What is the timezone offset for ${birthPlace}?\n\n` +
      `Examples:\n` +
      `  • New York (EST): -5 or (EDT): -4\n` +
      `  • London (GMT): 0 or (BST): +1\n` +
      `  • Tokyo (JST): +9\n` +
      `  • Los Angeles (PST): -8 or (PDT): -7\n` +
      `  • Paris (CET): +1 or (CEST): +2\n` +
      `  • Sydney (AEST): +10 or (AEDT): +11\n\n` +
      `If it was during Daylight Saving Time, use the DST offset.\n\n` +
      `Enter the offset from UTC (e.g., -5 or +9):`,
      '0'
    );
    
    const parsedOffset = parseFloat(offset);
    
    if (isNaN(parsedOffset)) {
      alert('Invalid timezone offset. Using 0 (UTC).');
      resolve(0);
    } else {
      resolve(parsedOffset);
    }
  });
}

/**
 * Better approach: Use Intl API to get browser's timezone
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

console.log('🌍 Timezone Helper module loaded!');