const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// Enable CORS for all origins so your app can access the proxy
app.use(cors());

// Proxy middleware with dynamic target from ?url=
app.use('/proxy', createProxyMiddleware({
  changeOrigin: true,
  router: (req) => {
    const targetUrl = req.query.url;
    if (!targetUrl || typeof targetUrl !== 'string' || targetUrl.trim() === '') {
      // No valid target URL, skip proxy to avoid error
      return null;
    }
    return targetUrl;
  },
  onProxyReq(proxyReq, req, res) {
    // Set headers needed by AliExpress CDN to allow proper access
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36');
    proxyReq.setHeader('Referer', 'https://www.aliexpress.com/');
  },
  onError(err, req, res) {
    console.error('Proxy error:', err); // Log for debugging
    res.status(500).send('Internal Server Error');
  },
  logLevel: 'debug'
}));

// Health check
app.get('/health', (req, res) => {
  res.send('Proxy server is running.');
});

// Start server on port from env or 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
});
