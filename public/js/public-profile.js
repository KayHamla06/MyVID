document.addEventListener('DOMContentLoaded', async () => {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  let dataUrl = null;

  if (pathParts[0] === 'publicinfo' && pathParts[1]) {
    dataUrl = `/publicinfo/${pathParts[1]}/data`;
  } else if (pathParts[0] === 'p' && pathParts[1]) {
    dataUrl = `/p/data/${pathParts[1]}`;
  }

  if (!dataUrl) {
    window.location.href = '/disabled.html';
    return;
  }
  
  try {
    const res = await fetch(dataUrl);
    
    if (!res.ok) {
      window.location.href = '/disabled.html';
      return;
    }
    
    const { data } = await res.json();
    
    // Set profile photo
    if (data.profilePhoto) {
      document.getElementById('profile-photo').src = data.profilePhoto;
    } else {
      document.getElementById('profile-photo').style.display = 'none';
    }
    
    // Set name
    document.getElementById('first-name').textContent = data.firstName || 'Unknown';
    document.getElementById('last-name').textContent = data.lastName || '';
    
    // Set country
    document.getElementById('country').textContent = data.country || 'Country not specified';
    
    document.getElementById('emergency-contacts').textContent = data.emergencyContacts && data.emergencyContacts.length > 0 ? '' : '<div class="empty-state">No emergency contacts specified</div>';
    // Populate medical alerts
    const alertsDiv = document.getElementById('medical-alerts');
    if (data.medicalAlerts && data.medicalAlerts.length > 0) {
      alertsDiv.innerHTML = '';
      data.medicalAlerts.forEach(alert => {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert';
        alertDiv.innerHTML = `
          <span class="alert-icon">⚠️</span>
          <span>${alert}</span>
        `;
        alertsDiv.appendChild(alertDiv);
      });
    } else {
      alertsDiv.innerHTML = '<div class="empty-state">No medical alerts specified</div>';
    }
    
    // Populate emergency contacts
    const contactsDiv = document.getElementById('emergency-contacts').textContent = data.emergencyContacts && data.emergencyContacts.length > 0 ? '' : '<div class="empty-state">No emergency contacts specified</div>';
    const contactsSection = document.getElementById('emergency-contacts-section');
    
    if (data.emergencyContacts && data.emergencyContacts.length > 0) {
      contactsDiv.innerHTML = '';
      data.emergencyContacts.forEach(contact => {
        const contactLink = document.createElement('a');
        contactLink.href = `tel:${contact.phone}`;
        contactLink.className = 'call-btn';
        contactLink.innerHTML = `📞 Call ${contact.name} - ${contact.phone}`;
        contactsDiv.appendChild(contactLink);
      });
    } else {
      contactsSection.style.display = 'none';
    }
    
  } catch (error) {
    console.error('Error loading profile:', error);
    window.location.href = '/disabled.html';
  }
});