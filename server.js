// =====================================================
// server.js
// Simple Blogging Platform - Main Server File
//
// Tech used: Express.js + MySQL (XAMPP) + express-session
// This file sets up the server, connects to the database,
// and defines all the API routes (Register, Login, Blogs CRUD).
// =====================================================

const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = 3000;

// ---------------------------------------------------
// MIDDLEWARE SETUP
// ---------------------------------------------------

// Parse incoming JSON and form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware - keeps the user logged in using a cookie
app.use(session({
    secret: 'blog-app-secret-key', // used to encrypt the session cookie
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 2 } // session lasts 2 hours
}));

// Serve all static files (HTML, CSS, JS) from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------
// DATABASE CONNECTION (XAMPP MySQL Defaults)
// ---------------------------------------------------
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',        // XAMPP MySQL has no password by default
    database: 'blogdb'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('👉 Make sure XAMPP MySQL is running and "blogdb" has been imported from database.sql');
        return;
    }
    console.log('✅ Connected to MySQL database (blogdb)');
});

// ---------------------------------------------------
// HELPER FUNCTION: check if a user is logged in
// ---------------------------------------------------
function isLoggedIn(req) {
    return req.session && req.session.user;
}

// =====================================================
// AUTH ROUTES
// =====================================================

// ----- REGISTER a new user -----
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;

    // Basic input validation
    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check whether the email is already registered
    const checkSql = 'SELECT id FROM users WHERE email = ?';
    db.query(checkSql, [email], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Server error: ' + err.message });

        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'This email is already registered.' });
        }

        // Encrypt (hash) the password before saving it
        const hashedPassword = bcrypt.hashSync(password, 10);

        const insertSql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        db.query(insertSql, [username, email, hashedPassword], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
            res.json({ success: true, message: 'Registration successful! You can now login.' });
        });
    });
});

// ----- LOGIN an existing user -----
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Server error: ' + err.message });

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = results[0];
        const passwordMatches = bcrypt.compareSync(password, user.password);

        if (!passwordMatches) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Store basic user info in the session
        req.session.user = { id: user.id, username: user.username, email: user.email };
        res.json({ success: true, message: 'Login successful!', user: req.session.user });
    });
});

// ----- LOGOUT the current user -----
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ success: false, message: 'Could not log out. Please try again.' });
        res.json({ success: true, message: 'Logged out successfully.' });
    });
});

// ----- CHECK SESSION (frontend uses this to know login state) -----
app.get('/api/session', (req, res) => {
    if (isLoggedIn(req)) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// =====================================================
// BLOG ROUTES (CRUD)
// =====================================================

// ----- GET all blogs (used on Home Page) -----
app.get('/api/blogs', (req, res) => {
    const sql = 'SELECT * FROM blogs ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
        res.json({ success: true, blogs: results });
    });
});

// ----- GET a single blog by ID (used on Edit Page) -----
app.get('/api/blogs/:id', (req, res) => {
    const sql = 'SELECT * FROM blogs WHERE id = ?';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }
        res.json({ success: true, blog: results[0] });
    });
});

// ----- CREATE a new blog -----
app.post('/api/blogs', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.status(401).json({ success: false, message: 'Please login to create a blog.' });
    }

    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const author = req.session.user.username;
    const sql = 'INSERT INTO blogs (title, content, author, created_at) VALUES (?, ?, ?, NOW())';
    db.query(sql, [title, content, author], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
        res.json({ success: true, message: 'Blog created successfully!', blogId: result.insertId });
    });
});

// ----- UPDATE (edit) an existing blog -----
app.put('/api/blogs/:id', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.status(401).json({ success: false, message: 'Please login to edit a blog.' });
    }

    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    // Only the original author is allowed to edit their own blog
    const checkSql = 'SELECT * FROM blogs WHERE id = ?';
    db.query(checkSql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }
        if (results[0].author !== req.session.user.username) {
            return res.status(403).json({ success: false, message: 'You can only edit your own blogs.' });
        }

        const updateSql = 'UPDATE blogs SET title = ?, content = ? WHERE id = ?';
        db.query(updateSql, [title, content, req.params.id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
            res.json({ success: true, message: 'Blog updated successfully!' });
        });
    });
});

// ----- DELETE a blog -----
app.delete('/api/blogs/:id', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.status(401).json({ success: false, message: 'Please login to delete a blog.' });
    }

    const checkSql = 'SELECT * FROM blogs WHERE id = ?';
    db.query(checkSql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }
        if (results[0].author !== req.session.user.username) {
            return res.status(403).json({ success: false, message: 'You can only delete your own blogs.' });
        }

        const deleteSql = 'DELETE FROM blogs WHERE id = ?';
        db.query(deleteSql, [req.params.id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
            res.json({ success: true, message: 'Blog deleted successfully!' });
        });
    });
});

// ---------------------------------------------------
// START THE SERVER
// ---------------------------------------------------
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
