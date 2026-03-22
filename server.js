const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());

// --- CONFIGURATION ---
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "ipromax2026";
const SHEET_CSV = process.env.SHEET_CSV_URL; 
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL; 
const WHATSAPP = process.env.WHATSAPP_NUMBER || "917306738779";

const auth = (req, res, next) => {
    const b64 = (req.headers.authorization || '').split(' ')[1] || '';
    const [u, p] = Buffer.from(b64, 'base64').toString().split(':');
    if (u === ADMIN_USER && p === ADMIN_PASS) return next();
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Auth Required');
};

app.get('/api/config', (req, res) => res.json({ sheet: SHEET_CSV, whatsapp: WHATSAPP }));

app.post('/api/save-win', async (req, res) => {
    try {
        await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(req.body) });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Sync failed" }); }
});

app.get('/api/staff-action', async (req, res) => {
    try {
        const { code, action } = req.query;
        let url = `${APPS_SCRIPT_URL}?action=${action}${code ? '&code='+code : ''}`;
        const response = await fetch(url);
        const text = await response.text();
        try { res.json(JSON.parse(text)); } catch (e) { res.send(text); }
    } catch (err) { res.status(500).send("Bridge Error"); }
});

app.get('/staff', auth, (req, res) => res.sendFile(path.join(__dirname, 'private', 'staff.html')));
app.use(express.static('public'));
app.get('*', (req, res) => res.redirect('/'));

app.listen(process.env.PORT || 3000);
