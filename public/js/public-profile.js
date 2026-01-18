document.addEventListener('DOMContentLoaded', async () => {
  const qrId = window.location.pathname.split('/').pop();
  const res = await fetch(`/p/data/${qrId}`);
  if (res.ok) {
    const { data } = await res.json();
    if (data.profilePhoto) document.getElementById('profile-photo').src = data.profilePhoto;
    document.getElementById('first-name').textContent = data.firstName || 'Unknown';
    document.getElementById('country').textContent = `Country: ${data.country || 'N/A'}`;
    const alertsDiv = document.getElementById('medical-alerts');
    data.medicalAlerts.forEach(alert => {
      const span = document.createElement('span');
      span.className = 'alert';
      span.textContent = alert;
      alertsDiv.appendChild(span);
    });
        const contactsDiv = document.getElementById('emergency-contacts');
    if (data.emergencyContacts && data.emergencyContacts.length > 0) {
      data.emergencyContacts.forEach(contact => {
        const a = document.createElement('a');
        a.href = `tel:${contact.phone}`;
        a.className = 'call-btn';
        a.textContent = `Call ${contact.name}`;
        contactsDiv.appendChild(a);
      });
    } else {
      contactsDiv.style.display = 'none';
    }
  } else {
    window.location.href = '/disabled.html'; // Fallback
  }
});