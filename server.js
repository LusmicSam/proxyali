const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// Enable CORS for all origins
app.use(cors());

// Target domains allowed for proxying
const allowedTargets = [
  'https://alicdn.com',
  'https://aliexpress.com',
  'https://*.akamai.net'
];

// Create proxy middleware with CORS headers fix
app.use('/proxy', createProxyMiddleware({
  target: '', // will be dynamically set per request
  changeOrigin: true,
  router: (req) => {
    // Extract target URL from query
    const targetUrl = req.query.url;
    if (!targetUrl) return null;
    // Validate allowed domains
    const allowed = allowedTargets.some(domain => {
      const regex = new RegExp(domain.replace(/\*/g, '.*'));
      return regex.test(targetUrl);
    });
    if (!allowed) return null;
    return targetUrl;
  },
  onProxyRes: function(proxyRes, req, res) {
    // Add CORS headers on proxy response
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
  },
  logLevel: 'debug',
  pathRewrite: {
    '^/proxy': '',
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.send('Proxy server is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
});
