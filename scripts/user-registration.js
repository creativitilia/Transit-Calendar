// ============================================
// USER REGISTRATION
// Uses birth-chart.js module
// ============================================

import { calculateBirthChart, saveBirthChart, loadBirthChart } from './birth-chart.js';
import { PLANET_SYMBOLS } from './astrology-core.js';

document.addEventListener('DOMContentLoaded', function() {
  checkIfUserRegistered(); 
  const registrationForm = document.getElementById('user-registration-form');
  if (registrationForm) {
    registrationForm.addEventListener('submit', handleRegistrationSubmit);  
  }
});

function checkIfUserRegistered() {
  const userData = localStorage.getItem('userRegistrationData');

  if (!userData) {
    showRegistrationDialog();
  } else {
    console.log('User is already registered.');
    displayWelcomeMessage();
  }
}

async function handleRegistrationSubmit(event) {
  event.preventDefault();

  const formData = {
    name: document.getElementById('user-name').value,
    birthday: document.getElementById('user-birthday').value,
    birthTime: document.getElementById('user-birth-time').value,
    birthPlace: document.getElementById('user-birth-place').value,
    birthLat: parseFloat(document. getElementById('user-birth-lat').value),
    birthLon: parseFloat(document.getElementById('user-birth-lon').value),
    email: document.getElementById('user-email').value,
    password: document.getElementById('user-password').value,
    registeredDate: new Date().toISOString()
  };
  
  // Validate that location was selected
  if (!formData. birthLat || !formData. birthLon) {
    alert('Please select a location from the dropdown suggestions.');
    return;
  }

  // Calculate birth chart (now async!)
  try {
    const birthChart = await calculateBirthChart(
      formData.birthday,
      formData.birthTime,
      formData.birthLat,
      formData.birthLon
    );
    
    formData. birthChart = birthChart;
    localStorage.setItem('userRegistrationData', JSON.stringify(formData));
    saveBirthChart(birthChart);

    // Close registration dialog
    const dialog = document. getElementById('user-registration-dialog');
    if (dialog) {
      dialog.close();
      dialog.remove();
    }

    // Show confirmation dialog
    showBirthChartConfirmation(formData);
    
  } catch (error) {
    console.error('❌ Error calculating birth chart:', error);
    alert('Sorry, there was an error calculating your birth chart.  Please try again.');
  }
}

// Show birth chart confirmation dialog
function showBirthChartConfirmation(userData) {
  const birthChart = userData.birthChart;
  
  if (!birthChart) {
    console.error('❌ No birth chart data! ');
    return;
  }
  
  // Create confirmation dialog
  const confirmDialog = document.createElement('dialog');
  confirmDialog.id = 'birth-chart-confirmation';
  confirmDialog.innerHTML = `
    <div class="birth-chart-confirmation">
      <h3>✨ Confirm Your Birth Chart</h3>
      <p>Please verify your "Big Three" astrological signs:</p>
      
      <div class="birth-chart-info">
        <div class="chart-row">
          <div class="chart-icon">${PLANET_SYMBOLS.sun}</div>
          <div class="chart-label">Sun Sign</div>
          <div class="chart-value">${Math.floor(birthChart.sun.degree)}° ${birthChart.sun.sign}</div>
        </div>
        
        <div class="chart-row">
          <div class="chart-icon">${PLANET_SYMBOLS.moon}</div>
          <div class="chart-label">Moon Sign</div>
          <div class="chart-value">${Math.floor(birthChart.moon.degree)}° ${birthChart.moon.sign}</div>
        </div>
        
        <div class="chart-row">
          <div class="chart-icon">⬆</div>
          <div class="chart-label">Rising Sign (Ascendant)</div>
          <div class="chart-value">${Math.floor(birthChart.ascendant.degree)}° ${birthChart.ascendant. sign}</div>
        </div>
      </div>
      
      <p class="confirmation-note">
        <small>If this doesn't look right, please check your birth time and location.</small>
      </p>
      
      <menu>
        <button type="button" id="chart-wrong-button" class="button-secondary">
          This looks wrong
        </button>
        <button type="button" id="chart-confirm-button" class="button-primary">
          Confirm ✓
        </button>
      </menu>
    </div>
  `;
  
  document.body.appendChild(confirmDialog);
  
  // Confirm button - save and continue
  document.getElementById('chart-confirm-button').addEventListener('click', () => {
    console.log('✅ Birth chart confirmed!');
    confirmDialog.close();
    confirmDialog.remove();
    
    alert(`Registration successful! Welcome, ${userData.name}!  🌟`);
    displayWelcomeMessage();
  });
  
  // Wrong button - clear data and restart
  document.getElementById('chart-wrong-button').addEventListener('click', () => {
    console.log('❌ Birth chart rejected - restarting registration');
    confirmDialog.close();
    confirmDialog.remove();
    
    localStorage.removeItem('userRegistrationData');
    localStorage.removeItem('birthChart');
    alert('Let\'s try again.  Please double-check your birth time and location.');
    showRegistrationDialog();
  });
  
  // Show the dialog
  try {
    confirmDialog.showModal();
  } catch (e) {
    confirmDialog.setAttribute('open', '');
  }
}

// Show a registration dialog (created dynamically)
function showRegistrationDialog() {
  if (document.getElementById('user-registration-dialog')) return;

  // Create dialog element
  const dialog = document.createElement('dialog');
  dialog.id = 'user-registration-dialog';
  dialog. innerHTML = `
    <form id="user-registration-form" method="dialog" class="user-registration-form">
      <h3>Register</h3>
      
      <label>
        Name
        <input id="user-name" name="name" type="text" required />
      </label>
      
      <label>
        Birthday
        <input id="user-birthday" name="birthday" type="date" required />
      </label>
      
      <label>
        Birth time
        <input id="user-birth-time" name="birthTime" type="time" required />
      </label>
      
      <label>
        Birth place
        <input 
          id="user-birth-place" 
          name="birthPlace"
          type="text" 
          placeholder="Start typing a city..."
          autocomplete="off"
          required />
        <div id="location-suggestions" class="location-suggestions"></div>
      </label>
      
      <input type="hidden" id="user-birth-lat" name="birthLat">
      <input type="hidden" id="user-birth-lon" name="birthLon">
      
      <label>
        Email
        <input id="user-email" name="email" type="email" />
      </label>
      
      <label>
        Password
        <input id="user-password" name="password" type="password" />
      </label>
      
      <menu>
        <button type="button" value="cancel" id="user-reg-cancel">Cancel</button>
        <button type="submit">Save</button>
      </menu>
    </form>
  `;

  document.body.appendChild(dialog);

  // Attach submit handler now that the form exists
  const registrationForm = document. getElementById('user-registration-form');
  if (registrationForm) {
    registrationForm.addEventListener('submit', handleRegistrationSubmit);
  }

  // Cancel button closes dialog without saving
  document. getElementById('user-reg-cancel')?.addEventListener('click', () => {
    dialog.close();
    dialog.remove();
  });
  
  // Initialize location search
  if (window.LocationSearch) {
    new window.LocationSearch(
      'user-birth-place',
      'location-suggestions',
      'user-birth-lat',
      'user-birth-lon'
    );
  }

  // Show modal
  try { 
    dialog.showModal(); 
  } catch (e) { 
    dialog.setAttribute('open',''); 
  }
}

function displayWelcomeMessage() {
  const userData = localStorage. getItem('userRegistrationData');
  if (userData) {
    const user = JSON.parse(userData);
    console.log(`Welcome back, ${user.name}!  🌟`);
    
    // Load and display birth chart info
    const birthChart = loadBirthChart();
    if (birthChart) {
      console.log(`  ${PLANET_SYMBOLS.sun} Sun:  ${birthChart.sun.degree}° ${birthChart.sun.sign}`);
      console.log(`  ${PLANET_SYMBOLS.moon} Moon: ${birthChart.moon. degree}° ${birthChart.moon.sign}`);
      console.log(`  ⬆ Ascendant: ${birthChart. ascendant.degree}° ${birthChart.ascendant.sign}`);
    }
  }
}

function clearUserData() {
  localStorage.removeItem('userRegistrationData');
  localStorage.removeItem('birthChart');
  alert('User data cleared. Please register again.');
  showRegistrationDialog();
}

// Make clearUserData available globally for testing
window.clearUserData = clearUserData;

console.log('📝 User Registration module loaded! ');
