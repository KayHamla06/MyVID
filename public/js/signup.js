document.addEventListener('DOMContentLoaded', () => {
  const notification = document.getElementById('notification');
  let recaptchaToken = null;

  // reCAPTCHA callback
  window.onRecaptchaSuccess = (token) => {
    recaptchaToken = token;
    console.log('✅ reCAPTCHA verified successfully');
  };
  
  const showNotification = (message, isServerError) => {
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
    }, 5000);
  };

  document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!document.getElementById('consent').checked) {
      showNotification('Consent required.', false);
      return;
    }

    if (!recaptchaToken) {
      showNotification('Please verify reCAPTCHA.', false);
      return;
    }
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Basic validation
    if (!email || !password) {
      showNotification('Please fill in all fields.', false);
      return;
    }
    
    if (password.length < 6) {
      showNotification('Password must be at least 6 characters long.', false);
      return;
    }
    
    console.log('Attempting signup with:', { email, passwordLength: password.length });
    
    try {
      const res = await fetch('/api/auth/signup', {
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
        showNotification(data.message || 'Signup failed.', res.status >= 500);
        // Reset reCAPTCHA
        grecaptcha.reset();
        recaptchaToken = null;
      }
    } catch (err) {
      console.error('Signup fetch error:', err);
      showNotification('Network error – check your internet connection.', true);
      grecaptcha.reset();
      recaptchaToken = null;
    }
  });
});