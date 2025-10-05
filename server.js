const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// Enable CORS for all origins so your app can access the proxy
app.use(cors());

// Helper function to safely decode URLs
function safelyDecodeURL(encodedUrl) {
  if (!encodedUrl) return null;
  
  let decodedUrl = encodedUrl;
  
  try {
    // Keep decoding until no more % encoded characters remain
    let previousUrl;
    do {
      previousUrl = decodedUrl;
      decodedUrl = decodeURIComponent(decodedUrl);
    } while (decodedUrl !== previousUrl && decodedUrl.includes('%'));
    
    return decodedUrl;
  } catch (error) {
    console.warn('URL decoding failed:', error.message);
    
    // Try to handle malformed URLs by replacing problematic characters
    try {
      // Remove any invalid encoding sequences
      decodedUrl = encodedUrl.replace(/%[^0-9a-fA-F]/g, '');
      decodedUrl = decodeURIComponent(decodedUrl);
      return decodedUrl;
    } catch (secondError) {
      console.error('Fallback decoding also failed:', secondError.message);
      return encodedUrl; // Return original as last resort
    }
  }
}

// Proxy middleware with enhanced URL handling
app.use('/proxy', createProxyMiddleware({
  changeOrigin: true,
  router: (req) => {
    let targetUrl = req.query.url;
    
    if (!targetUrl || typeof targetUrl !== 'string' || targetUrl.trim() === '') {
      console.log('No target URL provided');
      return null;
    }
    
    // Handle URL decoding
    const decodedUrl = safelyDecodeURL(targetUrl);
    
    // Validate the URL format
    try {
      new URL(decodedUrl);
      console.log('Proxying to decoded URL:', decodedUrl);
      return decodedUrl;
    } catch (urlError) {
      console.error('Invalid URL after decoding:', decodedUrl);
      // Try to see if it's a relative URL and make it absolute
      if (decodedUrl.startsWith('//')) {
        const absoluteUrl = 'https:' + decodedUrl;
        try {
          new URL(absoluteUrl);
          console.log('Proxying to fixed URL:', absoluteUrl);
          return absoluteUrl;
        } catch (e) {
          console.error('Still invalid URL:', absoluteUrl);
        }
      }
      return null;
    }
  },
  onProxyReq(proxyReq, req, res) {
    // Set headers needed by AliExpress CDN to allow proper access
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
    proxyReq.setHeader('Referer', 'https://www.aliexpress.com/');
    proxyReq.setHeader('Accept', 'image/webp,image/apng,image/*,*/*;q=0.8');
    proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9');
    
    console.log('Proxying request with headers:', proxyReq.getHeaders());
  },
  onError(err, req, res) {
    console.error('Proxy error for URL:', req.query.url, 'Error:', err.message);
    res.status(500).json({ 
      error: 'Proxy error',
      message: err.message,
      originalUrl: req.query.url
    });
  },
  logLevel: 'debug',
  timeout: 10000, // 10 second timeout
  proxyTimeout: 10000
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Proxy server is running',
    timestamp: new Date().toISOString()
  });
});

// URL testing endpoint
app.get('/decode-test', (req, res) => {
  const urlToTest = req.query.url || 'https%3A%2F%2Fae01.alicdn.com%2Fkf%2FS48cec483fac04ff9b5d824a4760f021ff%2F48x48.png';
  
  try {
    const decoded = safelyDecodeURL(urlToTest);
    const isValid = isValidUrl(decoded);
    
    res.json({
      original: urlToTest,
      decoded: decoded,
      isValid: isValid,
      testResult: isValid ? 'URL is valid and ready for proxying' : 'URL is invalid'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Helper function to validate URLs
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Enhanced proxy server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Decode test: http://localhost:${PORT}/decode-test?url=YOUR_ENCODED_URL`);
});
