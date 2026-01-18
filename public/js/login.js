document.addEventListener('DOMContentLoaded', () => {
    const notification = document.getElementById('notification');
  const showNotification = (message, isServerError) => {
    notification.textContent = `${message} ${isServerError ? '(Server-side issue - please try again later)' : '(Client-side issue - check your input)'}`;
    notification.classList.add('error');
    notification.style.display = 'block';
    setTimeout(() => { notification.style.display = 'none'; }, 5000);
  };

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    } else {
      showNotification(data.message || 'Login failed.', res.status >= 500);
    }
  });
});