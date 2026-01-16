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
    const contactA = document.getElementById('emergency-contact');
    if (data.emergencyContact) {
      contactA.href = `tel:${data.emergencyContact.phone}`;
      contactA.textContent = `Call ${data.emergencyContact.name}`;
    } else {
      contactA.style.display = 'none';
    }
  } else {
    window.location.href = '/disabled.html'; // Fallback
  }
});