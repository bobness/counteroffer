const express = require('express'),
      path = require('path'),
      logger = require('morgan'),
      bodyParser = require('body-parser'),
      app = express(),
      http = require('http'),
      { Client } = require('pg');

app.use('/', (req, res, next) => next(), express.static('public/co-me'));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

let client;
app.use(async (req, res, next) => {
  client = new Client({ // TODO: put into a parameters file
        user: 'postgres',
        password: 'p4ssw0rd',
        host: 'counteroffer.me',
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

function exit() {
  console.log('Exiting due to SIGINT');
  client.end(); // close pg connection
  process.exit();
}

process.on('SIGINT', exit);

module.exports = app;
