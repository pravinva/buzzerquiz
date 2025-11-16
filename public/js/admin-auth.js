// Simple password protection for admin page
// This runs before the page loads

(function() {
    // Check if already authenticated in this session
    const isAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true';

    if (!isAuthenticated) {
        // Simple password prompt
        const password = prompt('Enter admin password to access quiz upload:');

        // You can set your password in Vercel environment variable: ADMIN_PASSWORD
        // For now, using a default (change this!)
        const correctPassword = 'admin123'; // TODO: Change this password!

        if (password !== correctPassword) {
            alert('Incorrect password. Access denied.');
            window.location.href = '/'; // Redirect to main quiz app
        } else {
            sessionStorage.setItem('admin_authenticated', 'true');
        }
    }
})();
