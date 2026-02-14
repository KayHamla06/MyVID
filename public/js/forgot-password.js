document.addEventListener('DOMContentLoaded', () => {
  const notification = document.getElementById('notification');
  let recaptchaToken = null;
  let userEmail = '';
  const isProd = !['localhost', '127.0.0.1'].includes(window.location.hostname) && window.location.hostname !== '';

  // Dynamically load reCAPTCHA only in production to avoid blocking dev/tests
  if (isProd) {
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  } else {
    // Hide recaptcha placeholder in non-production
    const placeholder = document.getElementById('recaptcha-placeholder');
    if (placeholder) placeholder.style.display = 'none';
  }

  // reCAPTCHA callback
  window.onRecaptchaSuccess = (token) => {
    recaptchaToken = token;
    console.log('✅ reCAPTCHA verified successfully');
  };

  const showNotification = (message, isError = false) => {
    if (!notification) {
      alert(message);
      return;
    }

    notification.textContent = message;
    notification.classList.remove('notification-hidden');
    
    if (isError) {
      notification.classList.add('error');
      notification.classList.remove('success');
    } else {
      notification.classList.add('success');
      notification.classList.remove('error');
    }

    setTimeout(() => {
      notification.classList.add('notification-hidden');
    }, 6000);
  };

  const switchStep = (stepNumber) => {
    document.getElementById('step1-container').classList.toggle('form-hidden', stepNumber !== 1);
    document.getElementById('step2-container').classList.toggle('form-hidden', stepNumber !== 2);
    document.getElementById('step3-container').classList.toggle('form-hidden', stepNumber !== 3);
  };

  // Step 1: Request password reset with identity verification
  document.getElementById('forgot-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Require reCAPTCHA token only in production
    if (isProd && !recaptchaToken) {
      showNotification('Please verify reCAPTCHA.', true);
      return;
    }

    const email = document.getElementById('email').value.trim();
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const dateOfBirth = document.getElementById('dateOfBirth').value;
    const emergencyContactName = document.getElementById('emergencyContactName').value.trim();
    const emergencyContactPhone = document.getElementById('emergencyContactPhone').value.trim();

    if (!email || !firstName || !lastName || !dateOfBirth || !emergencyContactName || !emergencyContactPhone) {
      showNotification('Please fill in all required fields.', true);
      return;
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          dateOfBirth,
          emergencyContactName,
          emergencyContactPhone,
          recaptchaToken
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        userEmail = email;
        showNotification('Identity verified! Check your email for reset instructions.', false);
        setTimeout(() => {
          switchStep(2);
        }, 2000);
      } else {
        showNotification(data.message || 'Could not verify identity.', true);
        grecaptcha.reset();
        recaptchaToken = null;
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      showNotification('Network error – check your internet connection.', true);
      grecaptcha.reset();
      recaptchaToken = null;
    }
  });

  // Step 2: Reset password
  document.getElementById('reset-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const resetCode = document.getElementById('reset-code').value.trim();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!resetCode || !newPassword || !confirmPassword) {
      showNotification('Please fill in all fields.', true);
      return;
    }

    if (newPassword.length < 6) {
      showNotification('Password must be at least 6 characters.', true);
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('Passwords do not match.', true);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          resetCode,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showNotification('Password reset successfully!', false);
        setTimeout(() => {
          switchStep(3);
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }, 1000);
      } else {
        showNotification(data.message || 'Password reset failed.', true);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      showNotification('Network error – check your internet connection.', true);
    }
  });
});
