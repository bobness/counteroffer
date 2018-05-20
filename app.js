const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const index = require('./routes/index');
const app = express();
const http = require('http');

app.use('/', (req, res, next) => next(), express.static('public/bob.stark'));
app.use('/bob.stark', (req, res, next) => next(), express.static('public/bob.stark'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/email', index);

const server = http.createServer(app);
server.listen(process.env.PORT || 80);
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
