document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) return window.location.href = '/login';

  let profile = {};
  
  const showNotification = (message, type = 'success') => {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (res.ok) {
        const { data } = await res.json();
        profile = data;
        populateForms();
      } else {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
      showNotification('Error loading profile', 'error');
    }
  };

  const populateForms = () => {
    document.getElementById('firstName').value = profile.firstName || '';
    document.getElementById('firstNameVisible').checked = profile.firstNameVisible === true;
    document.getElementById('phoneNumber').value = profile.phoneNumber || '';
    document.getElementById('phoneVisible').checked = profile.phoneVisible === true;
    document.getElementById('country').value = profile.country || '';
    document.getElementById('countryVisible').checked = profile.countryVisible === true;
    document.getElementById('lastName').value = profile.lastName || '';
    document.getElementById('lastNameVisible').checked = profile.lastNameVisible === true;
    document.getElementById('address').value = profile.fullDetails?.address || '';
    document.getElementById('addressVisible').checked = profile.addressVisible === true;
    document.getElementById('dob').value = profile.fullDetails?.dob ? new Date(profile.fullDetails.dob).toISOString().split('T')[0] : '';
    document.getElementById('dobVisible').checked = profile.dobVisible === true;
    document.getElementById('medical-notes').value = profile.medicalNotes || '';
    if (document.getElementById('medicalAlertsVisible')) {
      document.getElementById('medicalAlertsVisible').checked = profile.medicalAlertsVisible === true;
    }
    if (document.getElementById('medicalNotesVisible')) {
      document.getElementById('medicalNotesVisible').checked = profile.medicalNotesVisible === true;
    }
    document.getElementById('emergencyContactsVisible').checked = profile.emergencyContactsVisible === true;

    // Show profile photo if exists
    if (profile.profilePhoto) {
      const preview = document.getElementById('photo-preview');
      preview.src = profile.profilePhoto;
      preview.style.display = 'block';
    }

    // Populate contacts
    const contactsList = document.getElementById('contacts-list');
    contactsList.innerHTML = '';
    if (profile.emergencyContacts && profile.emergencyContacts.length > 0) {
      profile.emergencyContacts.forEach((c, i) => {
        contactsList.innerHTML += `
          <div class="list-item">
            <div class="list-item-content">
              <strong>${c.name}</strong> - ${c.phone}
              <label class="checkbox-label">
                <input type="checkbox" data-index="${i}" ${c.isPublic ? 'checked' : ''}>
                Public
              </label>
            </div>
            <button data-index="${i}" class="remove-contact btn-small btn-danger">Remove</button>
          </div>
        `;
      });
    } else {
      contactsList.innerHTML = '<p class="empty-state">No emergency contacts added yet.</p>';
    }

    // Populate alerts
    const alertsList = document.getElementById('alerts-list');
    alertsList.innerHTML = '';
    if (profile.medicalAlerts && profile.medicalAlerts.length > 0) {
      profile.medicalAlerts.forEach((a, i) => {
        alertsList.innerHTML += `
          <div class="list-item">
            <span>${a}</span>
            <button data-index="${i}" class="remove-alert btn-small btn-danger">Remove</button>
          </div>
        `;
      });
    } else {
      alertsList.innerHTML = '<p class="empty-state">No medical alerts added yet.</p>';
    }

    // Update QR button text
    document.getElementById('toggle-qr').textContent = profile.qrEnabled ? 'Disable QR' : 'Enable QR';
    const viewPublicBtn = document.getElementById('view-public-profile');
    if (viewPublicBtn) {
      viewPublicBtn.disabled = !profile.qrEnabled;
      viewPublicBtn.title = profile.qrEnabled
        ? 'Open your public profile'
        : 'Enable QR to view your public profile';
    }
    
    // If QR exists, load it
    if (profile.qrId) {
      document.getElementById('generate-qr').textContent = 'Regenerate QR';
      loadQRPreview();
    }
  };

  const loadQRPreview = async () => {
    try {
      const res = await fetch('/api/user/qr/generate', { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = await res.json();
      
      if (data.success) {
        document.getElementById('qr-preview').src = data.qrDataUrl;
        document.getElementById('qr-preview').style.display = 'block';
        document.getElementById('download-svg').style.display = 'inline-block';
        document.getElementById('download-png').style.display = 'inline-block';
      }
    } catch (err) {
      console.error('QR preview error:', err);
    }
  };

  await fetchProfile();

  // Personal info form
  document.getElementById('personal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const updates = { 
        firstName: document.getElementById('firstName').value,
        firstNameVisible: document.getElementById('firstNameVisible').checked,
        phoneNumber: document.getElementById('phoneNumber').value.trim(),
        phoneVisible: document.getElementById('phoneVisible').checked,
        country: document.getElementById('country').value,
        countryVisible: document.getElementById('countryVisible').checked
      };
      const res = await fetch('/api/user/profile', { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        }, 
        body: JSON.stringify(updates) 
      });
      
      if (res.ok) {
        showNotification('Personal info saved!');
        await fetchProfile();
      } else {
        const error = await res.json();
        showNotification(error.message || 'Failed to save', 'error');
      }
    } catch (err) {
      console.error('Save error:', err);
      showNotification('Network error', 'error');
    }
  });

  // Photo upload
  document.getElementById('photo').addEventListener('change', async (e) => {
    if (!e.target.files[0]) return;
    
    try {
      const formData = new FormData();
      formData.append('photo', e.target.files[0]);
      
      const res = await fetch('/api/user/upload-photo', { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${token}` }, 
        body: formData 
      });
      
      const data = await res.json();
      
      if (data.success) {
        showNotification('Photo uploaded!');
        await fetchProfile();
      } else {
        showNotification(data.message || 'Upload failed', 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showNotification('Network error', 'error');
    }
  });

  // Contact form
  document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const newContact = { 
        name: document.getElementById('contact-name').value, 
        phone: document.getElementById('contact-phone').value, 
        isPublic: document.getElementById('contact-public').checked 
      };
      
      const updates = { emergencyContacts: [...(profile.emergencyContacts || []), newContact] };
      const res = await fetch('/api/user/profile', { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        }, 
        body: JSON.stringify(updates) 
      });
      
      if (res.ok) {
        showNotification('Contact added!');
        e.target.reset();
        await fetchProfile();
      }
    } catch (err) {
      console.error('Add contact error:', err);
      showNotification('Failed to add contact', 'error');
    }
  });

  // Remove contact
  document.getElementById('contacts-list').addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-contact')) {
      const index = parseInt(e.target.dataset.index);
      const contacts = [...profile.emergencyContacts];
      contacts.splice(index, 1);
      
      const res = await fetch('/api/user/profile', { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        }, 
        body: JSON.stringify({ emergencyContacts: contacts }) 
      });
      
      if (res.ok) {
        showNotification('Contact removed');
        await fetchProfile();
      }
    }
  });

  // Toggle contact public
  document.getElementById('contacts-list').addEventListener('change', async (e) => {
    if (e.target.type === 'checkbox') {
      const index = parseInt(e.target.dataset.index);
      const contacts = [...profile.emergencyContacts];
      contacts[index].isPublic = e.target.checked;
      
      await fetch('/api/user/profile', { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        }, 
        body: JSON.stringify({ emergencyContacts: contacts }) 
      });
      await fetchProfile();
    }
  });

  // Toggle emergency contacts visibility
  document.getElementById('emergencyContactsVisible').addEventListener('change', async (e) => {
    try {
      const res = await fetch('/api/user/profile', { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        }, 
        body: JSON.stringify({ emergencyContactsVisible: e.target.checked }) 
      });
      
      if (res.ok) {
        showNotification('Privacy setting updated!');
        await fetchProfile();
      }
    } catch (err) {
      console.error('Update visibility error:', err);
    }
  });

  // Add alert
  document.getElementById('add-alert').addEventListener('click', async () => {
    const alert = document.getElementById('medical-alert').value.trim();
    if (!alert) return;
    
    try {
      const updates = { medicalAlerts: [...(profile.medicalAlerts || []), alert] };
      const res = await fetch('/api/user/profile', { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        }, 
        body: JSON.stringify(updates) 
      });
      
      if (res.ok) {
        showNotification('Alert added!');
        document.getElementById('medical-alert').value = '';
        await fetchProfile();
      }
    } catch (err) {
      console.error('Add alert error:', err);
      showNotification('Failed to add alert', 'error');
    }
  });

  // Remove alert
  document.getElementById('alerts-list').addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-alert')) {
      const index = parseInt(e.target.dataset.index);
      const alerts = [...profile.medicalAlerts];
      alerts.splice(index, 1);
      
      const res = await fetch('/api/user/profile', { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        }, 
        body: JSON.stringify({ medicalAlerts: alerts }) 
      });
      
      if (res.ok) {
        showNotification('Alert removed');
        await fetchProfile();
      }
    }
  });

  // Medical form
  document.getElementById('medical-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const updates = { 
        medicalNotes: document.getElementById('medical-notes').value,
        medicalAlertsVisible: document.getElementById('medicalAlertsVisible') ? document.getElementById('medicalAlertsVisible').checked : false,
        medicalNotesVisible: document.getElementById('medicalNotesVisible') ? document.getElementById('medicalNotesVisible').checked : false
      };
      const res = await fetch('/api/user/profile', { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        }, 
        body: JSON.stringify(updates) 
      });
      
      if (res.ok) {
        showNotification('Medical info saved!');
        await fetchProfile();
      }
    } catch (err) {
      console.error('Save medical error:', err);
      showNotification('Failed to save', 'error');
    }
  });

  // Full details form
  document.getElementById('full-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const updates = { 
        lastName: document.getElementById('lastName').value,
        lastNameVisible: document.getElementById('lastNameVisible').checked,
        fullDetails: {
          address: document.getElementById('address').value,
          dob: document.getElementById('dob').value
        },
        addressVisible: document.getElementById('addressVisible').checked,
        dobVisible: document.getElementById('dobVisible').checked
      };
      const res = await fetch('/api/user/profile', { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        }, 
        body: JSON.stringify(updates) 
      });
      
      if (res.ok) {
        showNotification('Full details saved!');
        await fetchProfile();
      } else {
        const error = await res.json();
        showNotification(error.message || 'Failed to save', 'error');
      }
    } catch (err) {
      console.error('Save full details error:', err);
      showNotification('Failed to save', 'error');
    }
  });

  // Generate QR
  document.getElementById('generate-qr').addEventListener('click', async () => {
    try {
      const regenerate = Boolean(profile.qrId);
      const res = await fetch('/api/user/qr/generate', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ regenerate })
      });
      const data = await res.json();
      
      if (data.success) {
        showNotification('QR code generated!');
        document.getElementById('qr-preview').src = data.qrDataUrl;
        document.getElementById('qr-preview').style.display = 'block';
        document.getElementById('download-svg').style.display = 'inline-block';
        document.getElementById('download-png').style.display = 'inline-block';
        await fetchProfile();
      } else {
        showNotification(data.message || 'QR generation failed', 'error');
      }
    } catch (err) {
      console.error('QR generation error:', err);
      showNotification('Network error', 'error');
    }
  });

  // View public profile
  document.getElementById('view-public-profile').addEventListener('click', async () => {
    if (!profile.qrEnabled) {
      showNotification('Enable QR to view your public profile', 'error');
      return;
    }

    try {
      const res = await fetch('/api/user/qr/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success && data.publicUrl) {
        window.open(data.publicUrl, '_blank', 'noopener');
      } else {
        showNotification(data.message || 'Unable to open public profile', 'error');
      }
    } catch (err) {
      console.error('View public profile error:', err);
      showNotification('Network error', 'error');
    }
  });

  // Download QR - SVG
  document.getElementById('download-svg').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user/qr/download/svg', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'safepass-qr.svg';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification('QR downloaded!');
      }
    } catch (err) {
      console.error('Download error:', err);
      showNotification('Download failed', 'error');
    }
  });

  // Download QR - PNG
  document.getElementById('download-png').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user/qr/download/png', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'safepass-qr.png';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification('QR downloaded!');
      }
    } catch (err) {
      console.error('Download error:', err);
      showNotification('Download failed', 'error');
    }
  });

  // Toggle QR
  document.getElementById('toggle-qr').addEventListener('click', async () => {
    try {
      const enabled = !profile.qrEnabled;
      const res = await fetch('/api/user/qr/toggle', { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        }, 
        body: JSON.stringify({ enabled }) 
      });
      
      if (res.ok) {
        showNotification(`QR ${enabled ? 'enabled' : 'disabled'}!`);
        await fetchProfile();
      }
    } catch (err) {
      console.error('Toggle error:', err);
      showNotification('Failed to toggle QR', 'error');
    }
  });

  // Logout
  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  });
});