const express = require('express'),
      path = require('path'),
      logger = require('morgan'),
      bodyParser = require('body-parser'),
      app = express(),
      http = require('http'),
      { Client } = require('pg');

app.use('/', (req, res, next) => next(), express.static('public/co-me/bob.stark'));
app.use('/bob.stark', (req, res, next) => next(), express.static('public/co-me/bob.stark'));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(async (req, res, next) => {
  const client = new Client({
        user: 'root',
        password: 'i0t4*375',
        host: 'databases.cb304s4nzrdn.us-east-2.rds.amazonaws.com',
        port: 5432,
        database: 'counteroffer'
      });
  await client.connect();
  req.client = client;
  next();
});

const index = require('./routes/co-me');
app.use('/', index);

const server = http.createServer(app);
server.listen(process.env.PORT || 3001);
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
