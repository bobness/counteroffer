const express = require('express'),
      path = require('path'),
      logger = require('morgan'),
      bodyParser = require('body-parser'),
      app = express(),
      http = require('http'),
      { Client } = require('pg'),
      Portfolio = require('./routes/portfolio');

app.use('/', (req, res, next) => next(), express.static('public/co-app'));

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

const index = require('./routes/co-app');
app.use('/', index);

// const filePath = process.argv[2]; // node app.js [path]
const filePath = './portfolio.json';
const portfolio = new Portfolio(filePath);
app.set('portfolio', portfolio);
const pc = require('./routes/pc-routes');
app.use('/portfolio', pc);

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
