const express = require('express');
const session = require('express-session');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 1. SESSION CONFIGURATION
app.use(session({
    secret: 'ipromax-verification-secret-2026', // Use a random string
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS on Render
        maxAge: 1000 * 60 * 60 * 8 // 8-hour session
    }
}));

// 2. GOOGLE AUTH SETUP
const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAccountAuth);

// 3. STAFF CREDENTIALS
// You can add multiple staff accounts here
const STAFF_ACCOUNTS = {
    "admin": process.env.ADMIN_PASSWORD || "KochiFix2026",
    "kochi_staff": "ipro123",
    "trivandrum_staff": "ipro456"
};

// 4. AUTH MIDDLEWARE
const requireAuth = (req, res, next) => {
    if (req.session.staffId) {
        next();
    } else {
        res.redirect('/staff-login');
    }
};

// --- ROUTES ---

// Login Page
app.get('/staff-login', (req, res) => {
    res.send(`
        <html>
            <head><script src="https://cdn.tailwindcss.com"></script></head>
            <body class="bg-slate-900 flex items-center justify-center min-h-screen">
                <form action="/api/login" method="POST" class="bg-white p-8 rounded-2xl shadow-2xl w-80">
                    <h2 class="text-xl font-black mb-6 text-center uppercase">Staff Login</h2>
                    <input type="text" name="username" placeholder="Username" class="w-full p-3 mb-3 border rounded-lg outline-none" required>
                    <input type="password" name="password" placeholder="Password" class="w-full p-3 mb-6 border rounded-lg outline-none" required>
                    <button type="submit" class="w-full bg-slate-900 text-white py-3 rounded-lg font-bold">Sign In</button>
                </form>
            </body>
        </html>
    `);
});

// Login Execution
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (STAFF_ACCOUNTS[username] && STAFF_ACCOUNTS[username] === password) {
        req.session.staffId = username; // Create Server Session
        res.redirect('/admin-dashboard');
    } else {
        res.send("<script>alert('Invalid Access'); window.location='/staff-login';</script>");
    }
});

// Protected Dashboard
app.get('/admin-dashboard', requireAuth, async (req, res) => {
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Winners'];
        const rows = await sheet.getRows();

        const htmlRows = rows.map(row => {
            const vId = row.get('VoucherID');
            const status = row.get('Status');
            const isClaimed = status === 'Claimed';

            return `
                <tr class="border-b ${isClaimed ? 'bg-gray-50 opacity-50' : ''}">
                    <td class="p-4 text-xs">${row.get('Timestamp')}</td>
                    <td class="p-4 font-bold">${row.get('Name')}</td>
                    <td class="p-4 font-mono font-black text-blue-600">${vId}</td>
                    <td class="p-4 font-bold text-green-600">${row.get('Prize')}</td>
                    <td class="p-4">
                        ${isClaimed ? '✅' : `<button onclick="mark('${vId}')" class="bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-black">MARK CLAIMED</button>`}
                    </td>
                </tr>
            `;
        }).reverse().join('');

        res.send(`
            <html>
                <head><script src="https://cdn.tailwindcss.com"></script></head>
                <body class="bg-gray-100 p-6">
                    <div class="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
                        <div class="bg-slate-900 p-6 text-white flex justify-between items-center">
                            <h1 class="font-black">VERIFICATION STATION</h1>
                            <a href="/logout" class="text-xs border border-white/30 px-3 py-1 rounded">Logout (${req.session.staffId})</a>
                        </div>
                        <table class="w-full text-left">
                            <thead class="bg-gray-50 text-[10px] text-gray-400 uppercase">
                                <tr><th class="p-4">Time</th><th class="p-4">Name</th><th class="p-4">ID</th><th class="p-4">Prize</th><th class="p-4">Action</th></tr>
                            </thead>
                            <tbody>${htmlRows}</tbody>
                        </table>
                    </div>
                    <script>
                        async function mark(id) {
                            if(!confirm("Claim Voucher " + id + "?")) return;
                            const res = await fetch('/api/claim', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({ voucherId: id })
                            });
                            if(res.ok) location.reload();
                        }
                    </script>
                </body>
            </html>
        `);
    } catch (e) { res.status(500).send(e.message); }
});

// Mark Claimed API
app.post('/api/claim', requireAuth, async (req, res) => {
    const { voucherId } = req.body;
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Winners'];
        const rows = await sheet.getRows();
        const row = rows.find(r => r.get('VoucherID') === voucherId);
        if (row) {
            row.set('Status', 'Claimed');
            await row.save();
            res.json({ success: true });
        }
    } catch (e) { res.status(500).json({ success: false }); }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/staff-login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
