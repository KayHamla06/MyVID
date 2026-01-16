document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) return window.location.href = '/login';

  let profile = {};
  const fetchProfile = async () => {
    const res = await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const { data } = await res.json();
      profile = data;
      populateForms();
    } else {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  };

  const populateForms = () => {
    document.getElementById('firstName').value = profile.firstName || '';
    document.getElementById('country').value = profile.country || '';
    document.getElementById('lastName').value = profile.fullDetails?.lastName || '';
    document.getElementById('address').value = profile.fullDetails?.address || '';
    document.getElementById('dob').value = profile.fullDetails?.dob ? new Date(profile.fullDetails.dob).toISOString().split('T')[0] : '';
    document.getElementById('medical-notes').value = profile.medicalNotes || '';

    const contactsList = document.getElementById('contacts-list');
    contactsList.innerHTML = '';
    profile.emergencyContacts.forEach((c, i) => {
      contactsList.innerHTML += `<div>${c.name} - ${c.phone} <label>Public: <input type="checkbox" data-index="${i}" ${c.isPublic ? 'checked' : ''}></label> <button data-index="${i}" class="remove-contact">Remove</button></div>`;
    });

    const alertsList = document.getElementById('alerts-list');
    alertsList.innerHTML = '';
    profile.medicalAlerts.forEach((a, i) => {
      alertsList.innerHTML += `<div>${a} <button data-index="${i}" class="remove-alert">Remove</button></div>`;
    });

    document.getElementById('toggle-qr').textContent = profile.qrEnabled ? 'Disable QR' : 'Enable QR';
    if (profile.qrId) {
      document.getElementById('generate-qr').textContent = 'Regenerate Preview';
      fetch('/api/user/qr/generate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(({ qrDataUrl }) => document.getElementById('qr-preview').src = qrDataUrl);
      document.getElementById('download-svg').style.display = 'block';
      document.getElementById('download-svg').href = '/api/user/qr/download/svg';
      document.getElementById('download-png').style.display = 'block';
      document.getElementById('download-png').href = '/api/user/qr/download/png';
    }
  };

  await fetchProfile();

  document.getElementById('personal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const updates = { firstName: document.getElementById('firstName').value, country: document.getElementById('country').value };
    await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(updates) });
    await fetchProfile();
  });

  document.getElementById('photo').addEventListener('change', async (e) => {
    const formData = new FormData();
    formData.append('photo', e.target.files[0]);
    await fetch('/api/user/upload-photo', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
    await fetchProfile();
  });

  document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newContact = { name: document.getElementById('contact-name').value, phone: document.getElementById('contact-phone').value, isPublic: document.getElementById('contact-public').checked };
    const updates = { emergencyContacts: [...profile.emergencyContacts, newContact] };
    await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(updates) });
    e.target.reset();
    await fetchProfile();
  });

  document.getElementById('contacts-list').addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-contact')) {
      const index = e.target.dataset.index;
      const contacts = [...profile.emergencyContacts];
      contacts.splice(index, 1);
      await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ emergencyContacts: contacts }) });
      await fetchProfile();
    }
  });

  document.getElementById('contacts-list').addEventListener('change', async (e) => {
    if (e.target.type === 'checkbox') {
      const index = e.target.dataset.index;
      const contacts = [...profile.emergencyContacts];
      if (e.target.checked) {
        contacts.forEach((c, i) => { if (i !== parseInt(index)) c.isPublic = false; });
      }
      contacts[index].isPublic = e.target.checked;
      await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ emergencyContacts: contacts }) });
      await fetchProfile();
    }
  });

  document.getElementById('add-alert').addEventListener('click', async () => {
    const alert = document.getElementById('medical-alert').value;
    if (alert) {
      const updates = { medicalAlerts: [...profile.medicalAlerts, alert] };
      await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(updates) });
      document.getElementById('medical-alert').value = '';
      await fetchProfile();
    }
  });

  document.getElementById('alerts-list').addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-alert')) {
      const index = e.target.dataset.index;
      const alerts = [...profile.medicalAlerts];
      alerts.splice(index, 1);
      await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ medicalAlerts: alerts }) });
      await fetchProfile();
    }
  });

  document.getElementById('medical-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const updates = { medicalNotes: document.getElementById('medical-notes').value };
    await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(updates) });
    await fetchProfile();
  });

  document.getElementById('full-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const updates = { fullDetails: {
      lastName: document.getElementById('lastName').value,
      address: document.getElementById('address').value,
      dob: document.getElementById('dob').value
    } };
    await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(updates) });
    await fetchProfile();
  });

  document.getElementById('generate-qr').addEventListener('click', async () => {
    const res = await fetch('/api/user/qr/generate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const { qrDataUrl } = await res.json();
    document.getElementById('qr-preview').src = qrDataUrl;
    document.getElementById('download-svg').style.display = 'block';
    document.getElementById('download-svg').href = '/api/user/qr/download/svg';
    document.getElementById('download-png').style.display = 'block';
    document.getElementById('download-png').href = '/api/user/qr/download/png';
  });

  document.getElementById('toggle-qr').addEventListener('click', async () => {
    const enabled = !profile.qrEnabled;
    await fetch('/api/user/qr/toggle', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ enabled }) });
    await fetchProfile();
  });

  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  });
});