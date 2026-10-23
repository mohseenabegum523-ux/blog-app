// =====================================================
// script.js
// Simple Blogging Platform - Shared Frontend JavaScript
// Handles: navbar auth state, register, login, logout,
// listing blogs, creating, editing, and deleting blogs.
// =====================================================

// Run this on every page once the HTML has loaded
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();       // Show correct navbar links based on login state
    initRegisterPage();
    initLoginPage();
    initHomePage();
    initCreatePage();
    initEditPage();
    initLogoutButton();
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Show a message inside a message box element (success or error)
function showMessage(boxId, text, type) {
    const box = document.getElementById(boxId);
    if (!box) return;
    box.textContent = text;
    box.className = 'message-box show ' + type; // type = "success" or "error"
}

// Simple fetch wrapper that always sends/receives JSON
async function apiRequest(url, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
}

// Escape HTML to prevent XSS when injecting blog content into the page
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format a MySQL datetime string into a readable date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// =====================================================
// NAVBAR - update links based on login/logout state
// =====================================================
async function updateNavbar() {
    const loggedInLinks = document.getElementById('navLoggedIn');
    const loggedOutLinks = document.getElementById('navLoggedOut');
    const usernameSpan = document.getElementById('navUsername');

    if (!loggedInLinks || !loggedOutLinks) return; // navbar not present on this page

    const { data } = await apiRequest('/api/session');

    if (data.loggedIn) {
        loggedInLinks.classList.remove('hidden');
        loggedOutLinks.classList.add('hidden');
        if (usernameSpan) usernameSpan.textContent = 'Hi, ' + data.user.username;
    } else {
        loggedInLinks.classList.add('hidden');
        loggedOutLinks.classList.remove('hidden');
    }
}

// =====================================================
// LOGOUT BUTTON (present in navbar on all pages)
// =====================================================
function initLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async () => {
        await apiRequest('/api/logout', 'POST');
        window.location.href = 'index.html';
    });
}

// =====================================================
// REGISTER PAGE
// =====================================================
function initRegisterPage() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Client-side validation before hitting the server
        if (password !== confirmPassword) {
            showMessage('registerMessage', 'Passwords do not match.', 'error');
            return;
        }

        const { data } = await apiRequest('/api/register', 'POST', { username, email, password });

        if (data.success) {
            showMessage('registerMessage', data.message + ' Redirecting to login...', 'success');
            setTimeout(() => (window.location.href = 'login.html'), 1200);
        } else {
            showMessage('registerMessage', data.message, 'error');
        }
    });
}

// =====================================================
// LOGIN PAGE
// =====================================================
function initLoginPage() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const { data } = await apiRequest('/api/login', 'POST', { email, password });

        if (data.success) {
            showMessage('loginMessage', 'Login successful! Redirecting...', 'success');
            setTimeout(() => (window.location.href = 'index.html'), 800);
        } else {
            showMessage('loginMessage', data.message, 'error');
        }
    });
}

// =====================================================
// HOME PAGE - list all blogs, allow edit/delete on own posts
// =====================================================
function initHomePage() {
    const blogGrid = document.getElementById('blogGrid');
    if (!blogGrid) return;

    loadBlogs();

    async function loadBlogs() {
        const { data } = await apiRequest('/api/blogs');
        const sessionRes = await apiRequest('/api/session');
        const currentUsername = sessionRes.data.loggedIn ? sessionRes.data.user.username : null;

        if (!data.success || data.blogs.length === 0) {
            blogGrid.innerHTML = '<div class="empty-state">No blogs yet. Be the first to write one! 📝</div>';
            return;
        }

        blogGrid.innerHTML = data.blogs.map((blog) => {
            const isOwner = blog.author === currentUsername;
            const ownerButtons = isOwner
                ? `<a class="btn btn-secondary" href="edit.html?id=${blog.id}">Edit</a>
                   <button class="btn btn-danger" onclick="deleteBlog(${blog.id})">Delete</button>`
                : '';

            return `
                <div class="blog-card">
                    <h3>${escapeHtml(blog.title)}</h3>
                    <p class="blog-content">${escapeHtml(blog.content)}</p>
                    <div class="blog-meta">
                        <span>✍️ ${escapeHtml(blog.author)}</span>
                        <span>${formatDate(blog.created_at)}</span>
                    </div>
                    <div class="blog-card-actions">${ownerButtons}</div>
                </div>
            `;
        }).join('');
    }
}

// Delete a blog (called from the inline onclick on the Delete button)
async function deleteBlog(id) {
    const confirmed = confirm('Are you sure you want to delete this blog?');
    if (!confirmed) return;

    const { data } = await apiRequest('/api/blogs/' + id, 'DELETE');
    if (data.success) {
        window.location.reload();
    } else {
        alert(data.message);
    }
}

// =====================================================
// CREATE BLOG PAGE
// =====================================================
function initCreatePage() {
    const form = document.getElementById('createForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('title').value.trim();
        const content = document.getElementById('content').value.trim();

        const { data } = await apiRequest('/api/blogs', 'POST', { title, content });

        if (data.success) {
            showMessage('createMessage', 'Blog published! Redirecting...', 'success');
            setTimeout(() => (window.location.href = 'index.html'), 800);
        } else {
            showMessage('createMessage', data.message, 'error');
        }
    });
}

// =====================================================
// EDIT BLOG PAGE
// =====================================================
function initEditPage() {
    const form = document.getElementById('editForm');
    if (!form) return;

    // Get the blog id from the URL, e.g. edit.html?id=3
    const params = new URLSearchParams(window.location.search);
    const blogId = params.get('id');

    if (!blogId) {
        showMessage('editMessage', 'No blog selected to edit.', 'error');
        form.classList.add('hidden');
        return;
    }

    // Load existing blog data into the form
    loadBlog();

    async function loadBlog() {
        const { data } = await apiRequest('/api/blogs/' + blogId);
        if (!data.success) {
            showMessage('editMessage', data.message, 'error');
            form.classList.add('hidden');
            return;
        }
        document.getElementById('title').value = data.blog.title;
        document.getElementById('content').value = data.blog.content;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('title').value.trim();
        const content = document.getElementById('content').value.trim();

        const { data } = await apiRequest('/api/blogs/' + blogId, 'PUT', { title, content });

        if (data.success) {
            showMessage('editMessage', 'Blog updated! Redirecting...', 'success');
            setTimeout(() => (window.location.href = 'index.html'), 800);
        } else {
            showMessage('editMessage', data.message, 'error');
        }
    });
}
