const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public')); // Serves your HTML/JS from the public folder

// --- 1. GOOGLE AUTH CONFIGURATION ---
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  // The .replace is vital for Render to read the private key format correctly
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAccountAuth);

// --- 2. API: SAVE WINNER DATA ---
app.post('/api/save-winner', async (req, res) => {
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Winners']; 
        
        await sheet.addRow({
            Timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            Name: req.body.name || 'Guest',
            Phone: req.body.phone || 'N/A',
            Prize: req.body.prize,
            Status: 'Pending Verification'
        });

        res.json({ success: true });
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ success: false, error: "Failed to save to Sheets" });
    }
});


const session = require('express-session');

// Add session middleware
app.use(session({
    secret: 'ipromax-secure-key-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS on Render
}));

// Staff Credentials (In production, move these to Render Env Variables)
const STAFF_USERS = {
    "admin": process.env.ADMIN_PASSWORD || "KochiFix2026",
    "staff1": "ipro123",
    "staff2": "kochi456"
};

// --- LOGIN PAGE ROUTE ---
app.get('/staff-login', (req, res) => {
    res.send(`
        <html>
            <head><script src="https://cdn.tailwindcss.com"></script></head>
            <body class="bg-slate-900 flex items-center justify-center min-h-screen p-4">
                <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm">
                    <h2 class="text-2xl font-black mb-6 text-center text-slate-800 uppercase tracking-tight">Staff Portal</h2>
                    <form action="/api/login" method="POST" class="space-y-4">
                        <input type="text" name="username" placeholder="Username" class="w-full p-4 bg-gray-100 rounded-xl outline-none border-none focus:ring-2 focus:ring-blue-500">
                        <input type="password" name="password" placeholder="Password" class="w-full p-4 bg-gray-100 rounded-xl outline-none border-none focus:ring-2 focus:ring-blue-500">
                        <button type="submit" class="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition">Login</button>
                    </form>
                </div>
            </body>
        </html>
    `);
});

// --- LOGIN API ---
app.post('/api/login', express.urlencoded({ extended: true }), (req, res) => {
    const { username, password } = req.body;
    if (STAFF_USERS[username] && STAFF_USERS[username] === password) {
        req.session.authenticated = true;
        req.session.user = username;
        res.redirect('/admin-dashboard');
    } else {
        res.send("<script>alert('Invalid Credentials'); window.location='/staff-login';</script>");
    }
});

// --- PROTECTED DASHBOARD ---
app.get('/admin-dashboard', async (req, res) => {
    if (!req.session.authenticated) return res.redirect('/staff-login');

    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Winners'];
        const rows = await sheet.getRows();

        let htmlRows = rows.map(row => {
            const vId = row.get('VoucherID');
            const status = row.get('Status');
            const isClaimed = status === 'Claimed';

            return `
                <tr class="border-b ${isClaimed ? 'bg-gray-50 opacity-50' : ''}">
                    <td class="p-4 text-xs font-medium text-gray-400">${row.get('Timestamp')}</td>
                    <td class="p-4 font-bold text-slate-800">${row.get('Name')}</td>
                    <td class="p-4 font-mono font-black text-blue-600">${vId}</td>
                    <td class="p-4 font-bold text-green-600">${row.get('Prize')}</td>
                    <td class="p-4">
                        ${isClaimed 
                          ? '<span class="text-xs font-black text-gray-400">CLAIMED</span>' 
                          : `<button onclick="markClaimed('${vId}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-black shadow-lg hover:bg-blue-700">MARK CLAIMED</button>`
                        }
                    </td>
                </tr>
            `;
        }).reverse().join('');

        res.send(`
            <html>
                <head>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <script>
                        async function markClaimed(id) {
                            if(!confirm("Verify and Claim Voucher " + id + "?")) return;
                            const res = await fetch('/api/mark-claimed', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({ voucherId: id })
                            });
                            if(res.ok) location.reload();
                        }
                    </script>
                </head>
                <body class="bg-gray-100 p-4 md:p-10">
                    <div class="max-w-6xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-200">
                        <div class="bg-slate-900 p-8 text-white flex justify-between items-center">
                            <div>
                                <h1 class="text-2xl font-black uppercase tracking-tighter">Verification Station</h1>
                                <p class="text-xs text-slate-400 mt-1">Logged in as: ${req.session.user}</p>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="location.reload()" class="bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold">Refresh</button>
                                <a href="/api/logout" class="bg-red-500/20 text-red-400 border border-red-500/50 px-4 py-2 rounded-xl text-xs font-bold">Logout</a>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left">
                                <thead class="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-widest font-black">
                                    <tr><th class="p-4">Date</th><th class="p-4">Customer</th><th class="p-4">Voucher ID</th><th class="p-4">Prize</th><th class="p-4">Action</th></tr>
                                </thead>
                                <tbody>${htmlRows}</tbody>
                            </table>
                        </div>
                    </div>
                </body>
            </html>
        `);
    } catch (err) { res.status(500).send(err.message); }
});

// --- LOGOUT API ---
app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/staff-login');
});

// --- 3. ADMIN VIEW: PROTECTED DASHBOARD ---
app.get('/admin-dashboard', async (req, res) => {
    const { pwd } = req.query;
    if (pwd !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");

    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Winners'];
        const rows = await sheet.getRows();

        let htmlRows = rows.map(row => {
            const status = row.get('Status');
            const vId = row.get('VoucherID');
            const isClaimed = status === 'Claimed';

            return `
                <tr class="border-b ${isClaimed ? 'bg-gray-100 opacity-60' : ''}">
                    <td class="p-3 text-xs">${row.get('Timestamp')}</td>
                    <td class="p-3 font-bold">${row.get('Name')}</td>
                    <td class="p-3 font-mono text-blue-600">${vId}</td>
                    <td class="p-3 font-bold text-green-700">${row.get('Prize')}</td>
                    <td class="p-3">
                        ${isClaimed 
                            ? '<span class="text-gray-500 font-bold">✅ CLAIMED</span>' 
                            : `<button onclick="markClaimed('${vId}')" class="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold shadow hover:bg-blue-700">MARK CLAIMED</button>`
                        }
                    </td>
                </tr>
            `;
        }).reverse().join('');

        res.send(`
            <html>
                <head>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <script>
                        async function markClaimed(id) {
                            if(!confirm("Mark Voucher " + id + " as Claimed?")) return;
                            const res = await fetch('/api/mark-claimed', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({ voucherId: id, pwd: '${pwd}' })
                            });
                            if(res.ok) location.reload();
                        }
                    </script>
                </head>
                <body class="bg-gray-100 p-4 md:p-10">
                    <div class="max-w-5xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden">
                        <div class="bg-slate-900 p-6 text-white flex justify-between">
                            <h1 class="text-2xl font-black">STATION VERIFICATION</h1>
                            <button onclick="location.reload()" class="text-xs bg-slate-700 px-3 py-1 rounded">Refresh List</button>
                        </div>
                        <table class="w-full text-left">
                            <thead class="bg-gray-200 text-[10px] uppercase">
                                <tr><th class="p-3">Date</th><th class="p-3">Customer</th><th class="p-3">ID</th><th class="p-3">Prize</th><th class="p-3">Action</th></tr>
                            </thead>
                            <tbody>${htmlRows}</tbody>
                        </table>
                    </div>
                </body>
            </html>
        `);
    } catch (err) { res.status(500).send(err.message); }
});

// API: Staff Update Claim Status
app.post('/api/mark-claimed', async (req, res) => {
    const { voucherId, pwd } = req.body;

    if (pwd !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Winners'];
        const rows = await sheet.getRows();
        
        // Find the specific row by Voucher ID
        const row = rows.find(r => r.get('VoucherID') === voucherId);

        if (row) {
            row.set('Status', 'Claimed'); // Update the cell
            await row.save();
            res.json({ success: true, message: `Voucher ${voucherId} marked as Claimed!` });
        } else {
            res.status(404).json({ success: false, message: "Voucher ID not found." });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 4. SERVER START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server active on port ${PORT}`));
