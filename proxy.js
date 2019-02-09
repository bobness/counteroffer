const path = require('path'),
      http = require('http'),
      https = require('https'),
      httpProxy = require('http-proxy'),
      fs = require('fs'),
      tls = require('tls');

const proxy = httpProxy.createProxy();
const proxyOptions = {
  'counteroffer.me': 'http://localhost:3001',
  // 'counteroffer.app': 'http://localhost:3002', // disable until I get SSL working as .app is SSL-only
  'counteroffer.io': 'http://localhost:3002'
};

const certs = {
  'counteroffer.me': {
    key: fs.readFileSync(`/etc/letsencrypt/live/counteroffer.me/privkey.pem`, 'utf8'),
    cert: fs.readFileSync(`/etc/letsencrypt/live/counteroffer.me/cert.pem`, 'utf8')
  },
  'counteroffer.io': {
    key: fs.readFileSync(`/etc/letsencrypt/live/counteroffer.io/privkey.pem`, 'utf8'),
    cert: fs.readFileSync(`/etc/letsencrypt/live/counteroffer.io/cert.pem`, 'utf8')
  }
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

const serveFunction = (req, res) => {
  let hostname, proxyTarget;
  if (req.headers.host.indexOf('localhost') > -1) {
    // development
    hostname = parseUrlForDomain(req.url); // for the initial page load
    if (proxyOptions[hostname]) {
      proxyTarget = proxyOptions[hostname];
      req.url = '';
    } else if (req.headers.referer) {
      hostname = parseRefererForDomain(req.headers.referer); // for fetching resources after initial load
      proxyTarget = proxyOptions[hostname];
    }
  } else {
    // production
    hostname = req.headers.host;
    proxyTarget = proxyOptions[hostname];
  }

  console.log('proxyTarget: ', proxyTarget);

  if (proxyTarget) {
    proxy.web(req, res, {
      target: proxyTarget
    });
  } else {
    res.writeHead(404, res.headers);
  }
};

const httpServer = http.createServer((req, res) => {
  res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
  res.end();
}).listen(80);

httpServer.on('listening', () => {
	console.log('Listening on ', httpServer.address());
});

const httpsServer = https.createServer({
  SNICallback: (hostname, cb) => {
    let cert;
    if (hostname === 'localhost') {
      cert = Object.values(certs)[0];
    } else {
      cert = certs[hostname];
    }
    const ctx = tls.createSecureContext(cert);
    cb(null, ctx);
  }
}, serveFunction).listen(443);

httpsServer.on('listening', () => {
	console.log('Listening on ', httpsServer.address());
});
