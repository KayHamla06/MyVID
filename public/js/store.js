/**
 * Store page functionality
 */

document.addEventListener('DOMContentLoaded', () => {
  let items = [];

  loadStoreItems();

  const sortSelect = document.getElementById('store-sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => renderStoreItems(sortItems([...items], sortSelect.value)));
  }

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

  async function loadStoreItems() {
    try {
      const response = await fetch('/api/user/dashboard-feed', {
        headers: buildHeaders()
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Unable to load store items');
      }

      items = result.data.storeItems || [];
      renderStoreItems(sortItems([...items], document.getElementById('store-sort')?.value || 'createdAt-desc'));
    } catch (error) {
      console.error('Load store items error:', error);
      const container = document.getElementById('store-items');
      if (container) {
        container.innerHTML = '<p class="empty-state">Store items are not available right now.</p>';
      }
    }
  }

  function renderStoreItems(storeItems) {
    const container = document.getElementById('store-items');
    if (!container) return;

    if (!storeItems.length) {
      container.innerHTML = '<p class="empty-state">No store items have been published yet.</p>';
      return;
    }

    container.innerHTML = storeItems.map(item => `
      <article class="store-item-card">
        <img src="${item.imageUrl}" alt="${escapeHtml(item.name)}">
        <div class="store-item-body">
          <h4>${escapeHtml(item.name)}</h4>
          <p>${escapeHtml(item.description)}</p>
          <div class="store-item-meta">
            <span>${escapeHtml(item.category)}</span>
            <strong>R ${Number(item.price).toFixed(2)}</strong>
          </div>
          <button class="btn-primary btn-disabled" type="button" disabled>Order Coming Soon</button>
        </div>
      </article>
    `).join('');
  }

  function sortItems(storeItems, sortValue) {
    const [field, direction] = sortValue.split('-');
    return storeItems.sort((left, right) => {
      if (field === 'price') {
        return direction === 'asc' ? left.price - right.price : right.price - left.price;
      }

      if (field === 'createdAt') {
        return direction === 'desc'
          ? new Date(right.createdAt) - new Date(left.createdAt)
          : new Date(left.createdAt) - new Date(right.createdAt);
      }

      const leftValue = String(left[field] || '').toLowerCase();
      const rightValue = String(right[field] || '').toLowerCase();
      return direction === 'asc'
        ? leftValue.localeCompare(rightValue)
        : rightValue.localeCompare(leftValue);
    });
  }

  function buildHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
