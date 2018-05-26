const path = require('path'),
      http = require('http'),
      httpProxy = require('http-proxy');

const proxy = httpProxy.createProxy();
const proxyOptions = {
  'counteroffer.me': 'http://localhost:3001',
  'counteroffer.app': 'http://localhost:3002'
};

const server = http.createServer((req, res) => {
  // const target = proxyOptions[req.headers.host] // production
  
  // development
  const afterFirstSlash = req.url.substr(1);
  let secondSlashPos = afterFirstSlash.indexOf('/');
  if (secondSlashPos === -1) {
    secondSlashPos = afterFirstSlash.length;
  }
  const domainName = afterFirstSlash.substr(0, secondSlashPos),
        proxyTarget = proxyOptions[domainName],
        newUrl = afterFirstSlash.substr(secondSlashPos);
  if (proxyTarget) {
      req.url = newUrl;
      proxy.web(req, res, { target: proxyTarget });
      // TODO: make sure I don't need other options: https://github.com/nodejitsu/node-http-proxy/blob/master/lib/http-proxy.js#L22-L50
  }
}).listen(80);

server.on('listening', () => {
	console.log('Listening on ', server.address());
});
