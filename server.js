const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());

// --- CONFIGURATION (Set these in Render Dashboard) ---
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "ipromax2026";
const SHEET_CSV = process.env.SHEET_CSV_URL; 
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL; 
const WHATSAPP = process.env.WHATSAPP_NUMBER || "917306738779";

// Auth Middleware for Staff/Admin
const auth = (req, res, next) => {
    const b64 = (req.headers.authorization || '').split(' ')[1] || '';
    const [u, p] = Buffer.from(b64, 'base64').toString().split(':');
    if (u === ADMIN_USER && p === ADMIN_PASS) return next();
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Auth Required');
};

// --- PUBLIC API ---
app.get('/api/config', (req, res) => res.json({ sheet: SHEET_CSV, whatsapp: WHATSAPP }));

app.post('/api/save-win', async (req, res) => {
    try {
        await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(req.body) });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Sync failed" }); }
});

// --- STAFF API BRIDGE (Fixes JSON errors) ---
app.get('/api/staff-action', async (req, res) => {
    try {
        const { code, action, data } = req.query;
        let url = `${APPS_SCRIPT_URL}?action=${action}`;
        if(code) url += `&code=${code}`;
        if(data) url += `&data=${encodeURIComponent(data)}`;
        
        const response = await fetch(url);
        const text = await response.text();
        try { res.json(JSON.parse(text)); } catch (e) { res.send(text); }
    } catch (err) { res.status(500).send("Connection to Google failed"); }
});

// --- PROTECTED ROUTES ---
app.get('/staff', auth, (req, res) => res.sendFile(path.join(__dirname, 'private', 'staff.html')));

app.use(express.static('public'));
app.get('*', (req, res) => res.redirect('/'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`iPromax Server Live on ${PORT}`));