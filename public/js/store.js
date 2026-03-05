/**
 * Store page functionality
 */

document.addEventListener('DOMContentLoaded', () => {
  // Handle notify form submission
  const notifyForm = document.getElementById('notify-form');
  
  if (notifyForm) {
    notifyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailInput = document.getElementById('notify-email');
      const email = emailInput.value.trim();
      
      if (!email) {
        showNotification('Please enter a valid email address', 'error');
        return;
      }
      
      try {
        // TODO: Implement backend endpoint for store notifications
        // For now, just show a success message
        showNotification('Thank you! We\'ll notify you when the store launches.', 'success');
        emailInput.value = '';
      } catch (error) {
        console.error('Notify error:', error);
        showNotification('Failed to subscribe. Please try again.', 'error');
      }
    });
  }
  
  // Notification helper
  function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
      notif.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  }
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
});
