document.addEventListener('DOMContentLoaded', () => {
  const notification = document.getElementById('notification');
  let recaptchaToken = null;

  // reCAPTCHA callback
  window.onRecaptchaSuccess = (token) => {
    recaptchaToken = token;
    console.log('✅ reCAPTCHA verified successfully');
  };

  const showNotification = (message, isServerError = false) => {
    if (!notification) {
      console.error('Notification element not found');
      alert(message);
      return;
    }

    notification.textContent = message;
    notification.classList.add('error');
    notification.classList.remove('notification-hidden');

    setTimeout(() => {
      notification.classList.add('notification-hidden');
      notification.classList.remove('error');
    }, 6000);
  };

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!recaptchaToken) {
      showNotification('Please verify reCAPTCHA.', false);
      return;
    }

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
        body: JSON.stringify({ 
          email, 
          password,
          recaptchaToken
        })
      });

      console.log('Response status:', res.status);

      const data = await res.json();
      console.log('Response data:', data);

      if (res.ok && data.success) {
        localStorage.setItem('token', data.token);
        window.location.href = '/dashboard';
      } else {
        showNotification(data.message || 'Login failed.', res.status >= 500);
        // Reset reCAPTCHA
        grecaptcha.reset();
        recaptchaToken = null;
      }
    } catch (err) {
      console.error('Login fetch error:', err);
      showNotification('Network error – check your internet connection.', true);
      grecaptcha.reset();
      recaptchaToken = null;
    }
  });
});