const path = require('path'),
      http = require('http'),
      httpProxy = require('http-proxy'),
      fs = require('fs');

const proxy = httpProxy.createProxy();
const proxyOptions = {
  'counteroffer.me': 'http://localhost:3001',
  // 'counteroffer.app': 'http://localhost:3002', // disable until I get SSL working as .app is SSL-only
  'counteroffer.io': 'http://localhost:3002'
};

const parseUrlForDomain = (url) => {
  // ~ '/counteroffer.me'
  return url.match(/^\/(.*)/)[1];
};

const parseRefererForDomain = (referer) => {
  // ~ 'http://localhost/counteroffer.me'
  const match = referer.match(/http:\/\/localhost(:\d+)?\/([^\/]+)\/?/);
  return match ? match[2] : null;
};

const server = http.createServer((req, res) => {
  let proxyTarget;
  if (req.headers.host.indexOf('localhost') > -1) {
    // development
    let domainName = parseUrlForDomain(req.url); // for the initial page load
    if (proxyOptions[domainName]) {
      proxyTarget = proxyOptions[domainName];
      req.url = '';
    } else if (req.headers.referer) {
      domainName = parseRefererForDomain(req.headers.referer); // for fetching resources after initial load
      proxyTarget = proxyOptions[domainName];
    }
  } else {
    // production
    proxyTarget = proxyOptions[req.headers.host];
  }

  if (proxyTarget) {
    const privateKey = fs.readFileSync(`/etc/letsencrypt/live/${proxyTarget}/privkey.pem`, 'utf8');
    const certificate = fs.readFileSync(`/etc/letsencrypt/live/${proxyTarget}/cert.pem`, 'utf8');
    // const ca = fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/chain.pem', 'utf8');
    proxy.web(req, res, {
      target: proxyTarget,
      ssl: { key: privateKey, cert: certificate }
    });
  } else {
    res.writeHead(404, res.headers);
  }
}).listen(443);

server.on('listening', () => {
	console.log('Listening on ', server.address());
});
