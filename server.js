// server.js
// Backend for the Image-to-Video app.
// the server (never in the browser) handles API calls.

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const API_KEY = process.env.KLING_API_KEY;
const KLING_BASE = 'https://api.kling.ai/v1';

if (!API_KEY) {
  console.error('Missing KLING_API_KEY environment variable');
  process.exit(1);
}

// Serve static files from public folder
app.use(express.static('public'));

// POST /api/generate - accepts image + prompt + duration + scale
app.post('/api/generate', upload.single('image'), async (req, res) => {
  try {
    const { prompt, duration, scale } = req.body;
    const imageBuffer = req.file.buffer;

    if (!imageBuffer) {
      return res.status(400).json({ error: 'Image required' });
    }

    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');

    // Call Kling API - image to video
    const formData = new FormData();
    formData.append('prompt', prompt || 'A beautiful video');
    formData.append('image', new Blob([imageBuffer]), 'image.jpg');
    formData.append('duration', duration || '10');
    formData.append('mode', 'std');

    const response = await fetch(`${KLING_BASE}/videos/image2video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Kling API error starting generation' });
    }

    res.json({ taskId: data.data.task_id });
  } catch (err) {
    console.error('Error during generation:', err);
    res.status(500).json({ error: err.message || 'Failed to start generation' });
  }
});

// GET /api/status/:taskId - poll for video completion
app.get('/api/status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    const response = await fetch(`${KLING_BASE}/videos/image2video/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Kling API error checking status' });
    }

    // Check if video is ready
    const task = data.data;
    if (task.status === 'succeeded') {
      res.json({
        status: 'completed',
        videoUrl: task.videos[0].url,
      });
    } else if (task.status === 'processing') {
      res.json({ status: 'processing' });
    } else {
      res.json({
        status: 'error',
        error: task.error || 'Video generation failed',
      });
    }
  } catch (err) {
    console.error('Error checking status:', err);
    res.status(500).json({ error: err.message || 'Failed to check status' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
