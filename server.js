const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json({ limit: '5mb' }));

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;


app.post('/api/gemini', async (req, res) => {
  try {
    if (
      req.body.contents?.some((content) =>
        content.parts?.some(
          (part) =>
            part.inline_data && part.inline_data.data?.length > 5 * 1024 * 1024
        )
      )
    ) {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API request failed');
    }

    res.json(data);
  } catch (error) {
    res
      .status(error.message.includes('Rate limit') ? 429 : 500)
      .json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Dummy backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
