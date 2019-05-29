import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

var BigNumber = require('bignumber.js');

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

let oracleIndexes = new Array();

web3.eth.getAccounts().then(e => {

  let accounts = e;

  // Upon startup, 20+ oracles are registered and their assigned indexes are persisted in memory
  let fee = 1; 
  let toWei = (new BigNumber(10)).pow(18);

  for(let a=1; a<=20; a++) {      
    console.log("account ", a, "=", accounts[a])
    console.log("value =", fee, "*", toWei)
    
    flightSuretyApp.methods
    .registerOracle()
    .send({ from:accounts[a], value:fee*toWei, gas:3000000 }, (error, result) => {

      flightSuretyApp.methods
      .getMyIndexes()
      .call({from: accounts[a]}, (error, result) => { 

        oracleIndexes[a] = result; 
        console.log('oracle #', a, ': indices =', oracleIndexes[a])
      })

    });
    
  }

});


flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log('Error =', error)
    console.log('Event =', event)
    
    // Server will loop through all registered oracles,
    // identify those oracles for which the OracleRequest event applies,
    // and respond by calling into FlightSuretyApp contract 
    // with random status code of Unknown (0), On Time (10) or Late Airline (20), Late Weather (30), Late Technical (40), or Late Other (50)
    for(let a=1; a<=20; a++) {
      if(!oracleIndexes[a]) {break;}

      var requestedIndex = event.returnValues['index'];
      var statusCode = getRandomIntInclusive(0,5) * 10;
      var isApplicable = ( (requestedIndex == oracleIndexes[a][0]) || (requestedIndex == oracleIndexes[a][1]) || (requestedIndex == oracleIndexes[a][2]) );

      console.log('oracle #', a, ': ', requestedIndex, (isApplicable?' is':'not'), 'in', oracleIndexes[a], (isApplicable?'=> submit status code':''), (isApplicable?statusCode:''))
      if( isApplicable ) {
        flightSuretyApp.methods.submitOracleResponse(requestedIndex, event.returnValues['airline'], event.returnValues['flight'], event.returnValues['timestamp'], statusCode);
      }
    }
});

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
}


const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;