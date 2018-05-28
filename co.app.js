const express = require('express'),
      path = require('path'),
      logger = require('morgan'),
      bodyParser = require('body-parser'),
      app = express(),
      http = require('http');

app.use('/', (req, res, next) => next(), express.static('public/co-app'));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const index = require('./routes/co-app');
app.use('/', index);

const server = http.createServer(app);
server.listen(process.env.PORT || 3002);
server.on('listening', () => {
	console.log('Listening on ', server.address());
});

app.use(function(err, req, res, next) {
  console.log('error! ' + err);
  return res.status(err.status || 500).json({
    message: err.message,
    error: err
  });
});

module.exports = app;
