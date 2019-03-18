const sleep = millis => new Promise(resolve => setTimeout(resolve, millis));

module.exports = {
  sleep,
};
