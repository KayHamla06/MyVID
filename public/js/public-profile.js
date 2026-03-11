document.addEventListener('DOMContentLoaded', async () => {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  let dataUrl = null;
  let profileIdentifier = null;

  if (pathParts[0] === 'publicinfo' && pathParts[1]) {
    dataUrl = `/publicinfo/${pathParts[1]}/data`;
    profileIdentifier = { username: pathParts[1] };
  } else if (pathParts[0] === 'p' && pathParts[1]) {
    dataUrl = `/p/data/${pathParts[1]}`;
    profileIdentifier = { qrId: pathParts[1] };
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

    updateSeo(data.seo);
    await logScan(data, profileIdentifier);
    
    // Set profile photo
    if (data.profilePhoto) {
      document.getElementById('profile-photo').src = data.profilePhoto;
    } else {
      document.getElementById('profile-photo').style.display = 'none';
    }
    
    // Set name
    document.getElementById('first-name').textContent = data.firstName || 'Unknown';
    document.getElementById('last-name').textContent = data.lastName || '';

    const verifiedBadge = document.getElementById('verified-badge');
    if (data.verified) {
      verifiedBadge.classList.remove('hidden');
      verifiedBadge.textContent = `✔ Verified SafePassID${data.verifiedMethod ? ` (${data.verifiedMethod})` : ''}`;
    } else {
      verifiedBadge.classList.add('hidden');
    }
    
    // Set country
    document.getElementById('country').textContent = data.country || 'Country not specified';

    renderSummary(data);
    
    // Display Address if visible
    const addressSection = document.getElementById('address-section');
    const addressDisplay = document.getElementById('address-display');
    const hasAddressData = data.houseNumber || data.streetName || data.suburb || data.town || data.postalCode || data.province;
    
    if (hasAddressData) {
      addressDisplay.innerHTML = '';
      const addressParts = [];
      
      if (data.houseNumber) addressParts.push(data.houseNumber);
      if (data.streetName) addressParts.push(data.streetName);
      if (data.suburb) addressParts.push(data.suburb);
      if (data.town) addressParts.push(data.town);
      if (data.postalCode) addressParts.push(data.postalCode);
      if (data.province) addressParts.push(data.province);
      
      if (addressParts.length > 0) {
        const addressDiv = document.createElement('div');
        addressDiv.className = 'address-block';
        addressDiv.innerHTML = addressParts.join(', ');
        addressDisplay.appendChild(addressDiv);
      } else {
        addressSection.style.display = 'none';
      }
    } else {
      addressSection.style.display = 'none';
    }
    
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
      document.getElementById('medical-section').classList.add('hidden');
    }

    renderEmergencyOnlyFields(data);
    
    // Populate emergency contacts
    const contactsDiv = document.getElementById('emergency-contacts');
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

    const emergencyToggle = document.getElementById('emergency-toggle');
    emergencyToggle.addEventListener('click', () => {
      document.body.classList.toggle('emergency-mode-active');
      emergencyToggle.classList.toggle('active');
      emergencyToggle.textContent = document.body.classList.contains('emergency-mode-active')
        ? 'Hide Emergency Info'
        : '🚨 Emergency Info';
    });
    
  } catch (error) {
    console.error('Error loading profile:', error);
    window.location.href = '/disabled.html';
  }
});

function renderSummary(data) {
  const summaryContainer = document.getElementById('summary-content');
  const summarySection = document.getElementById('public-summary');
  const items = [];

  if (data.phoneNumber) {
    items.push({ label: 'Phone Number', value: data.phoneNumber });
  }

  if (data.address) {
    items.push({ label: 'Address', value: data.address });
  }

  if (data.dateOfBirth) {
    items.push({ label: 'Date of Birth', value: new Date(data.dateOfBirth).toLocaleDateString() });
  }

  if (items.length === 0) {
    summarySection.classList.add('hidden');
    return;
  }

  summarySection.classList.remove('hidden');
  summaryContainer.innerHTML = items.map(item => `
    <div class="summary-item">
      <span class="summary-label">${escapeHtml(item.label)}</span>
      <span class="summary-value">${escapeHtml(item.value)}</span>
    </div>
  `).join('');
}

function renderEmergencyOnlyFields(data) {
  const notesSection = document.getElementById('medical-notes-section');
  const bloodTypeSection = document.getElementById('blood-type-section');
  const allergiesSection = document.getElementById('allergies-section');

  if (data.medicalNotes) {
    notesSection.classList.remove('hidden');
    document.getElementById('medical-notes').textContent = data.medicalNotes;
  }

  if (data.bloodType) {
    bloodTypeSection.classList.remove('hidden');
    document.getElementById('blood-type').textContent = data.bloodType;
  }

  if (Array.isArray(data.allergies) && data.allergies.length > 0) {
    allergiesSection.classList.remove('hidden');
    document.getElementById('allergies').innerHTML = data.allergies.map(allergy => `
      <div class="alert">
        <span class="alert-icon">⚠️</span>
        <span>${escapeHtml(allergy)}</span>
      </div>
    `).join('');
  }
}

async function logScan(data, identifier) {
  try {
    const payload = {
      userId: data.id,
      qrId: identifier && identifier.qrId ? identifier.qrId : undefined,
      accessType: identifier && identifier.username ? 'direct_link' : 'qr_scan',
      device: {
        type: detectDeviceType(),
        browser: navigator.userAgent,
        os: navigator.platform || 'Unknown'
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async position => {
        payload.location = {
          city: 'Approximate location',
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        };

        await sendScanLog(payload);
      }, async () => {
        await sendScanLog(payload);
      }, { maximumAge: 300000, timeout: 3000 });
      return;
    }

    await sendScanLog(payload);
  } catch (error) {
    console.warn('Scan logging skipped:', error);
  }
}

function sendScanLog(payload) {
  return fetch('/api/scan-log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

function updateSeo(seo) {
  if (!seo) return;

  document.title = seo.title || document.title;
  setMeta('description', seo.description, true);
  setMeta('og:title', seo.title);
  setMeta('og:description', seo.description);
  setMeta('og:type', seo.type);
  setMeta('og:url', seo.url);
  setMeta('og:image', seo.image);
}

function setMeta(name, content, isNameAttribute = false) {
  const selector = isNameAttribute ? `meta[name="${name}"]` : `meta[property="${name}"]`;
  const meta = document.querySelector(selector);
  if (meta) {
    meta.setAttribute('content', content || '');
  }
}

function detectDeviceType() {
  const source = navigator.userAgent.toLowerCase();
  if (source.includes('mobile')) return 'mobile';
  if (source.includes('tablet')) return 'tablet';
  return 'desktop';
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}