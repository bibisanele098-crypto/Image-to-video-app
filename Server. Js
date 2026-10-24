// server.js
// Backend for the Image-to-Video app. Keeps your Kling API key safe on
// the server (never in the browser) and proxies generation requests.

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');

const API_KEY = process.env.KLING_API_KEY;
const KLING_BASE = 'https://api.kling.ai';

if (!API_KEY) {
  console.error('Missing KLING_API_KEY — set it in your environment variables');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function buildAuthToken() {
  return API_KEY;
}

app.post('/api/generate', upload.single('image'), async (req, res) => {
  try {
    const { prompt, duration, scale } = req.body;
    if (!req.file || !prompt) {
      return res.status(400).json({ error: 'image and prompt are required' });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const token = buildAuthToken();

    const klingRes = await fetch(`${KLING_BASE}/v1/videos/image2video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_name: 'kling-v2-master',
        image: imageBase64,
        prompt,
        duration: String(Math.min(Math.max(Number(duration) || 5, 1), 30)),
        cfg_scale: scale === '1080p' ? 0.8 : scale === '720p' ? 0.6 : 0.4,
      }),
    });

    const data = await klingRes.json();
    if (!klingRes.ok) {
      return res.status(klingRes.status).json({ error: data.message || 'Kling API error', raw: data });
    }

    res.json({ taskId: data.data.task_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error starting generation' });
  }
});

app.get('/api/status/:taskId', async (req, res) => {
  try {
    const token = buildAuthToken();
    const klingRes = await fetch(`${KLING_BASE}/v1/videos/image2video/${req.params.taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await klingRes.json();
    if (!klingRes.ok) {
      return res.status(klingRes.status).json({ error: data.message || 'Kling API error' });
    }

    const task = data.data;
    if (task.task_status === 'succeed') {
      return res.json({ status: 'done', videoUrl: task.task_result.videos[0].url });
    } else if (task.task_status === 'failed') {
      return res.json({ status: 'failed', reason: task.task_status_msg });
    }
    res.json({ status: 'processing' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error checking status' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
