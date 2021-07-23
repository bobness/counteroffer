const express = require('express'),
      path = require('path'),
      logger = require('morgan'),
      bodyParser = require('body-parser'),
      app = express(),
      http = require('http'),
      { Client } = require('pg');

console.log('*** co.app.js accessed');
app.use('/', (req, res, next) => next(), express.static('public/co-app'));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(async (req, res, next) => {
  const client = new Client({
    user: 'postgres',
    password: 'p4ssw0rd',
    host: 'aws.datagotchi.net',
    port: 5432,
    database: 'counteroffer'
  });
  console.log('*** connecting to postgres client...');
  await client.connect(); // FIXME: not connecting to the db
  console.log('*** postgres client connected');
  req.client = client;
  next();
});

const index = require('./routes/co-app');
app.use('/', index);

console.log('*** routes added');

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
