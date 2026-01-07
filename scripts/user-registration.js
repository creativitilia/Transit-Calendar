
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
  }
}

function handleRegistrationSubmit(event) {
  event.preventDefault();

  const formData = {
    name: document.getElementById('user-name').value,
    birthday: document.getElementById('user-birthday').value,
    birthTime: document.getElementById('user-birth-time').value,
    birthPlace: document.getElementById('user-birth-place').value,
    email: document.getElementById('user-email').value,
    password: document.getElementById('user-password').value,
    registeredDate: new Date().toISOString()
  };

  localStorage.setItem('userRegistrationData', JSON.stringify(formData));

  const dialog = document.getElementById('user-registration-dialog');
  if (dialog) {
    dialog.close();
  }

  alert('Registration successful! Welcome, ' + formData.name + '!');
  displayWelcomeMessage();
}

// Show a registration dialog
function showRegistrationDialog() {
  const dialog = document.getElementById('user-registration-dialog');
  
  // If dialog exists in HTML, just show it
  if (dialog) {
    try { dialog.showModal(); } catch (e) { dialog.setAttribute('open',''); }
    return;
  }

  // Otherwise, create dialog element dynamically (fallback)
  const newDialog = document.createElement('dialog');
  newDialog.id = 'user-registration-dialog';
  newDialog.innerHTML = `
    <form id="user-registration-form" method="dialog" class="user-registration-form">
      <h3>Register</h3>
      <label>Name<br><input id="user-name" required /></label><br>
      <label>Birthday<br><input id="user-birthday" type="date" required /></label><br>
      <label>Birth time<br><input id="user-birth-time" type="time" required /></label><br>
      <label>Birth place<br><input id="user-birth-place" required /></label><br>
      <label>Email<br><input id="user-email" type="email" /></label><br>
      <label>Password<br><input id="user-password" type="password" /></label><br>
      <menu>
        <button value="cancel" id="user-reg-cancel">Cancel</button>
        <button type="submit">Save</button>
      </menu>
    </form>
  `;

  document.body.appendChild(newDialog);

  // Attach submit handler now that the form exists
  const registrationForm = document.getElementById('user-registration-form');
  if (registrationForm) registrationForm.addEventListener('submit', handleRegistrationSubmit);

  // Cancel button closes dialog without saving
  document.getElementById('user-reg-cancel')?.addEventListener('click', () => newDialog.close());

  // Show modal
  try { newDialog.showModal(); } catch (e) { newDialog.setAttribute('open',''); }
}

function displayWelcomeMessage() {
  const userData = localStorage.getItem('userRegistrationData');
  if (userData) {
    const user = JSON.parse(userData);
    console.log('Welcome back, ' + user.name + '!');
  }
}

function clearUserData() {
  localStorage.removeItem('userRegistrationData');
  alert('User data cleared. Please register again.');
  showRegistrationDialog();
}
