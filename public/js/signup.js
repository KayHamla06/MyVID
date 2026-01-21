document.addEventListener('DOMContentLoaded', () => {
  const notification = document.getElementById('notification');
  
  const showNotification = (message, isServerError) => {
    if (!notification) {
      console.error('Notification element not found');
      alert(message);
      return;
    }
    
    const suffix = isServerError 
      ? '(Server-side issue - please try again later)' 
      : '(Client-side issue - check your input)';
    
    notification.textContent = `${message} ${suffix}`;
    notification.classList.add('error');
    notification.style.display = 'block';
    
    setTimeout(() => { 
      notification.style.display = 'none'; 
      notification.classList.remove('error');
    }, 5000);
  };

  document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!document.getElementById('consent').checked) {
      showNotification('Consent required.', false);
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
        body: JSON.stringify({ email, password })
      });
      
      console.log('Response status:', res.status);
      
      const data = await res.json();
      console.log('Response data:', data);
      
      if (res.ok && data.success) {
        localStorage.setItem('token', data.token);
        window.location.href = '/dashboard';
      } else {
        showNotification(data.message || 'Signup failed.', res.status >= 500);
      }
    } catch (err) {
      console.error('Signup fetch error:', err);
      showNotification('Network error – check your internet connection.', true);
    }
  });
});