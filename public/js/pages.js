/**
 * Shared functionality for Contact and About pages
 */

document.addEventListener('DOMContentLoaded', () => {
  // Logout functionality
  const logoutBtn = document.querySelector('[data-logout]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = '/';
    });
  }

  // Handle navigation active state
  const navLinks = document.querySelectorAll('.header-nav a');
  const currentPath = window.location.pathname;
  
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Smooth scroll behavior
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Add active class to header nav based on current page
  const pathname = window.location.pathname;
  const navItems = {
    '/contact.html': 'contact',
    '/about.html': 'about',
    '/dashboard.html': 'dashboard',
    '/': 'home'
  };

  Object.entries(navItems).forEach(([path, name]) => {
    if (pathname.includes(path) && path !== '/') {
      document.querySelectorAll('.header-nav a').forEach(a => {
        if (a.getAttribute('href') === path) {
          a.classList.add('active');
        }
      });
    }
  });
});
