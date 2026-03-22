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
