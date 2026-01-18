document.addEventListener('DOMContentLoaded', () => {
    const notification = document.getElementById('notification');
  const showNotification = (message, isServerError) => {
    notification.textContent = `${message} ${isServerError ? '(Server-side issue - please try again later)' : '(Client-side issue - check your input)'}`;
    notification.classList.add('error');
    notification.style.display = 'block';
    setTimeout(() => { notification.style.display = 'none'; }, 5000);
  };

  document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!document.getElementById('consent').checked) {
      showNotification('Consent required.', false);
      return;
    }
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
     if (res.ok) {
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    } else {
      showNotification(data.message || 'Signup failed.', res.status >= 500);
    }
  });
});