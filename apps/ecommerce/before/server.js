const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
  } else if (req.url === '/api/metrics') {
    res.writeHead(200);
    res.end(JSON.stringify({ uptime: process.uptime(), timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(200);
    res.end(JSON.stringify({ message: 'Hello OTel' }));
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
