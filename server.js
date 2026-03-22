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

    if (pwd !== process.env.ADMIN_PASSWORD) {
        return res.status(401).send("<h1>Access Denied</h1>");
    }

    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Winners'];
        const rows = await sheet.getRows();

        let htmlRows = rows.map(row => `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3">${row.get('Timestamp')}</td>
                <td class="p-3 font-semibold">${row.get('Name')}</td>
                <td class="p-3 text-blue-600">${row.get('Phone')}</td>
                <td class="p-3 text-green-700 font-bold">${row.get('Prize')}</td>
                <td class="p-3 text-sm text-gray-500">${row.get('Status')}</td>
            </tr>
        `).reverse().join(''); // Show newest winners first

        res.send(`
            <html>
                <head><script src="https://cdn.tailwindcss.com"></script></head>
                <body class="bg-gray-100 p-4 md:p-10">
                    <div class="max-w-5xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden">
                        <div class="bg-blue-600 p-6 text-white flex justify-between items-center">
                            <h1 class="text-2xl font-bold">Scratch Card Winners</h1>
                            <span class="bg-blue-800 px-3 py-1 rounded text-sm">Live Updates</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead class="bg-gray-200">
                                    <tr>
                                        <th class="p-3">Time</th><th class="p-3">Name</th>
                                        <th class="p-3">Contact</th><th class="p-3">Prize</th>
                                        <th class="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>${htmlRows}</tbody>
                            </table>
                        </div>
                    </div>
                </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

// --- 4. SERVER START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server active on port ${PORT}`));
