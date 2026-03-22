const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public')); // For your CSS/JS files

// Initialize Auth
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAccountAuth);

// Route: Save Winner
app.post('/api/win', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Winners'];
    await sheet.addRow({
      Timestamp: new Date().toLocaleString(),
      Name: req.body.name,
      Email: req.body.email,
      Prize: req.body.prize
    });
    res.status(200).send({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false });
  }
});

// Route: Get Prize List
app.get('/api/prizes', async (req, res) => {
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['Prizes'];
  const rows = await sheet.getRows();
  const prizes = rows.map(row => ({ name: row.get('Name'), weight: row.get('Weight') }));
  res.json(prizes);
});

app.listen(3000, () => console.log('Server running on port 3000'));
