const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = 'admin123'; // In production use environment variables

app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname));

const CONTENT_FILE = path.join(__dirname, 'data', 'content.json');
const LEADS_FILE = path.join(__dirname, 'data', 'leads.json');

// Helper to read JSON
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
// Helper to write JSON
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Auth Middleware
const authMiddleware = (req, res, next) => {
    if (req.cookies.admin_token === 'secret-session-token') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// API: Get content
app.get('/api/content', (req, res) => {
    try {
        const content = readJson(CONTENT_FILE);
        res.json(content);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load content' });
    }
});

// API: Submit lead
app.post('/api/leads', (req, res) => {
    try {
        const { name, email, message } = req.body;
        const leads = readJson(LEADS_FILE);
        const newLead = {
            id: Date.now(),
            name,
            email,
            message,
            date: new Date().toISOString()
        };
        leads.push(newLead);
        writeJson(LEADS_FILE, leads);
        res.status(201).json({ message: 'Lead saved' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save lead' });
    }
});

// API: Admin Login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.cookie('admin_token', 'secret-session-token', { httpOnly: true, sameSite: 'strict' });
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'Invalid password' });
    }
});

// API: Admin Logout
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ success: true });
});

// API: Update content (Protected)
app.post('/api/admin/content', authMiddleware, (req, res) => {
    try {
        writeJson(CONTENT_FILE, req.body);
        res.json({ message: 'Content updated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update content' });
    }
});

// API: Get leads (Protected)
app.get('/api/admin/leads', authMiddleware, (req, res) => {
    try {
        const leads = readJson(LEADS_FILE);
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
