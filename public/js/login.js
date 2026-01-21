document.addEventListener('DOMContentLoaded', () => {
  const notification = document.getElementById('notification');

  const showNotification = (message, isServerError = false) => {
    if (!notification) {
      console.error('Notification element not found');
      alert(message);
      return;
    }

    const suffix = isServerError 
      ? '(Server-side issue – please try again later or contact support)'
      : '(Client-side issue – please check your email/password)';

    notification.textContent = `${message} ${suffix}`;
    notification.classList.add('error');
    notification.style.display = 'block';

    setTimeout(() => {
      notification.style.display = 'none';
      notification.classList.remove('error');
    }, 6000);
  };

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;

    if (!email || !password) {
      showNotification('Please fill in both email and password.', false);
      return;
    }

    console.log('Attempting login with:', { email });

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log('Response status:', res.status);

      const data = await res.json();
      console.log('Response data:', data);

      if (res.ok && data.success) {
        localStorage.setItem('token', data.token);
        window.location.href = '/dashboard';
      } else {
        showNotification(data.message || 'Login failed.', res.status >= 500);
      }
    } catch (err) {
      console.error('Login fetch error:', err);
      showNotification('Network error – check your internet connection.', true);
    }
  });
});