let express = require('express');
const db = require('./db');
const utils = require('./utils');
const NodeCache = require( "node-cache" );
const smokejs = require('@smokenetwork/smoke-js');

const myCache = new NodeCache( { stdTTL: 60, checkperiod: 60 } );

let app = express();
const port = process.env.PORT || 8200;

smokejs.api.setOptions({url: 'https://pubrpc.smoke.io'});
smokejs.config.set('address_prefix', 'SMK');
smokejs.config.set('chain_id', '1ce08345e61cd3bf91673a47fc507e7ed01550dab841fd9cdb0ab66ef576aaf0');

fetch_data = async () => {
  let data = myCache.get("data");

  if (typeof data !== 'undefined' && data !== null){
    // do nothing
  } else {
    data = await db.getDB().all('SELECT * FROM sponsor ORDER BY amount DESC');

    {
      // update about and website
      let usernames = data.map(item => item.accountname);
      const accounts = await smokejs.api.getAccountsAsync(usernames);

      let metadatas = {};
      accounts.forEach((item) => {
        try {
          const name = item['name'];

          let metadata = item['json_metadata'];
          if (typeof metadata === 'string') {
            metadata = JSON.parse(metadata);
          }
          let about = "Smoke Sponsor"; // default
          let website = "https://smoke.io"; // default

          try { about = metadata['profile']['about']; } catch (err) {}
          try { website = metadata['profile']['website']; } catch (err) {}

          metadatas[name] = {
            about,
            website
          }

        } catch (e) {}
      });

      console.log(JSON.stringify(metadatas));

      // update to data
      data = data.map( item => {
        return Object.assign(item, metadatas[item.accountname]);
      });
    }

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