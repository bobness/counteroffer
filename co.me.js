const express = require('express'),
      path = require('path'),
      logger = require('morgan'),
      bodyParser = require('body-parser'),
      app = express(),
      http = require('http'),
      { Pool } = require('pg');

app.use('/', (req, res, next) => next(), express.static('public/co-me'));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const pool = new Pool({ // TODO: put into a parameters file
  user: 'postgres',
  password: 'p4ssw0rd',
  host: 'counteroffer.me',
  port: 5432,
  database: 'counteroffer',
  max: 50
});

app.use(async (req, res, next) => {
  req.pool = pool;
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

async function exit() {
  console.log('Exiting and cleaning up PG pool...');
  await pool.end();
  console.log('Done. Exiting.');
  process.exit();
}

// process.on('exit', exit);
process.on('SIGINT', exit);
process.on('SIGTERM', exit);

module.exports = app;
