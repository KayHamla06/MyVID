document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!document.getElementById('consent').checked) return alert('Consent required');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      const { token } = await res.json();
      localStorage.setItem('token', token);
      window.location.href = '/dashboard';
    } else {
      // Attempt to parse the error response from the server
      try {
        const errorData = await res.json();
        // Display a more specific error message if available
        alert(errorData.message || 'Signup failed');
      } catch (jsonError) {
        // Fallback if the response is not valid JSON
        alert('Signup failed: An unexpected error occurred.');
      }
    }
  });
});