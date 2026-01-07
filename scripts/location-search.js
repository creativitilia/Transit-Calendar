// ============================================
// LOCATION SEARCH - Geocoding with Nominatim
// Free OpenStreetMap geocoding service
// ============================================

class LocationSearch {
  constructor(inputId, suggestionsId, latInputId, lonInputId) {
    this.input = document.getElementById(inputId);
    this.suggestionsContainer = document.getElementById(suggestionsId);
    this.latInput = document.getElementById(latInputId);
    this.lonInput = document.getElementById(lonInputId);
    
    this.selectedLocation = null;
    this.debounceTimer = null;
    
    this.init();
  }
  
  init() {
    if (!this.input) return;
    
    // Listen for typing
    this.input.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      // Clear previous timer
      clearTimeout(this.debounceTimer);
      
      // Wait 500ms after user stops typing
      this.debounceTimer = setTimeout(() => {
        if (query. length >= 3) {
          this.searchLocation(query);
        } else {
          this.hideSuggestions();
        }
      }, 500);
    });
    
    // Close suggestions when clicking outside
    document. addEventListener('click', (e) => {
      if (!this.input.contains(e.target) && !this.suggestionsContainer.contains(e.target)) {
        this.hideSuggestions();
      }
    });
  }
  
  async searchLocation(query) {
    try {
      // Use Nominatim API (OpenStreetMap)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Transit-Calendar-App' // Required by Nominatim
        }
      });
      
      const results = await response.json();
      this.showSuggestions(results);
      
    } catch (error) {
      console.error('Location search error:', error);
    }
  }
  
  showSuggestions(results) {
    if (results.length === 0) {
      this.suggestionsContainer.innerHTML = '<div class="location-suggestion">No locations found</div>';
      this.suggestionsContainer.classList.add('active');
      return;
    }
    
    const html = results.map(result => `
      <div class="location-suggestion" data-lat="${result.lat}" data-lon="${result.lon}" data-name="${result.display_name}">
        <strong>${result.display_name. split(',')[0]}</strong>
        <small>${result.display_name}</small>
      </div>
    `).join('');
    
    this.suggestionsContainer.innerHTML = html;
    this.suggestionsContainer.classList. add('active');
    
    // Add click listeners
    this.suggestionsContainer. querySelectorAll('.location-suggestion').forEach(item => {
      item.addEventListener('click', () => {
        this.selectLocation({
          name: item.dataset.name,
          lat: parseFloat(item. dataset.lat),
          lon: parseFloat(item.dataset.lon)
        });
      });
    });
  }
  
  selectLocation(location) {
    this.selectedLocation = location;
    this.input.value = location.name. split(',').slice(0, 2).join(','); // Show city, country
    this.latInput.value = location.lat;
    this.lonInput.value = location. lon;
    
    console.log('📍 Location selected:', location);
    
    this.hideSuggestions();
  }
  
  hideSuggestions() {
    this.suggestionsContainer.classList. remove('active');
  }
  
  getSelectedLocation() {
    return this.selectedLocation;
  }
}

// Make available globally
window.LocationSearch = LocationSearch;
console.log('🗺️ Location Search loaded! ');