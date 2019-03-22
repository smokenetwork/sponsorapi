let express = require('express');
const db = require('./db');
const utils = require('./utils');
const NodeCache = require( "node-cache" );

const myCache = new NodeCache( { stdTTL: 60, checkperiod: 60 } );

let app = express();

const port = process.env.PORT || 8200;

fetch_data = async () => {
  let data = myCache.get("data");

  if (typeof data !== 'undefined' && data !== null){
    // do nothing
  } else {
    data = await db.getDB().all('SELECT * FROM sponsor ORDER BY amount DESC');

    // remember to set cache
    myCache.set("data", data);
  }

  return data;
};

fetch_status = async () => {
  let status = myCache.get("status");

  if (typeof status !== 'undefined' && status !== null){
    // do nothing
  } else {
    status = await db.getDB().all('SELECT * FROM cronjob');

    // remember to set cache
    myCache.set("status", status);
  }

  return status;
};

serverStart = async () => {
  await db.init();

  let router = express.Router();

  router.get('/list', async (req, res) => {
    try {
      const data = await fetch_data();
      res.status(200).json(data);
    } catch(e) {
      console.log(e);
      res.status(500).json(e);
    } finally {

    }
  });


  router.get('/status', async (req, res) => {
    try {
      const status = await fetch_status();
      res.status(200).json(status);
    } catch(e) {
      console.log(e);
      res.status(500).json(e);
    } finally {

    }
  });

  app.use('/', router);

  app.listen(port);
  console.log('api on port ' + port);
};

serverStart();