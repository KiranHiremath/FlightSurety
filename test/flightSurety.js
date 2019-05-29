
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
   
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyApp.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) Register first airline when contract is deployed', async () => {
    
    result = await config.flightSuretyData.isAirline.call(config.firstAirline);

    // ASSERT
    assert.equal(result, true, "First Airline is not registered during deployment!!");

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    newAirline = accounts[2];

    // ACT
    try {
       await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
     }
    catch(e) {
        assert.equal(true, e.message.search("Airline not yet funded") >=0);
    }
    result = await config.flightSuretyData.isAirline.call(newAirline);

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
  });

  it('(airline) Funding less than 10 ether- fail with insufficient funds', async () => {
    
    // ARRANGE
    newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.fund.sendTransaction({from:config.firstAirline, value:1*config.weiMultiple});
        assert.fail("Exception expected");
    }
     catch(e) {
        assert.equal(true, e.message.search("Insufficent Fund") >=0);
     }
     result = await config.flightSuretyData.isAirline.call(newAirline);

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  it('(airline) register a new Airline using registerAirline() after funding', async () => {
    
    // ARRANGE
    secondAirline = accounts[2];

    // ACT
    try {
         await config.flightSuretyApp.fund.sendTransaction({from:config.firstAirline, value:10*config.weiMultiple});
    }
     catch(e) {
        assert.fail("Exception not expected");
     }

    // ACT
    try {
       await config.flightSuretyApp.registerAirline(secondAirline, {from: config.firstAirline});
    }
    catch(e) {
        console.log(e);
        assert.fail("Exception not expected");
    }
    result = await config.flightSuretyData.isAirline.call(secondAirline);

    // ASSERT
    assert.equal(result, true, "Airline should able to register another airline after funding");
   
    //Fund and activae
    try{
        await config.flightSuretyApp.fund.sendTransaction({from:secondAirline, value:10*config.weiMultiple}); 
    }
    catch(e){
        console.log(e);
    }

    result = await config.flightSuretyData.isAirlineActive.call(secondAirline);
    assert.equal(result, true, "Airline should have been active");
});

  it('(airline) First four Airlines do not need voting during activation', async () => {
    
    // ARRANGE
    thirdAirline = accounts[3];
    fourthAirline = accounts[4];
  
    try {
            await config.flightSuretyApp.registerAirline(thirdAirline, {from: config.firstAirline});
            await config.flightSuretyApp.registerAirline(fourthAirline, {from: config.firstAirline});
        }
    catch(e) {
        console.log(e);
        assert.fail("Exception not expected");
    }
    result = await config.flightSuretyData.isAirlineVoted.call(thirdAirline);
    assert.equal(result, true, "Airline should have been voted");

    result = await config.flightSuretyData.isAirlineVoted.call(fourthAirline);
    assert.equal(result, true, "Airline should have been voted");

    //Fund and activate
    await config.flightSuretyApp.fund.sendTransaction({from:thirdAirline, value:10*config.weiMultiple});
    await config.flightSuretyApp.fund.sendTransaction({from:fourthAirline, value:10*config.weiMultiple});
    
    result = await config.flightSuretyData.isAirlineActive.call(thirdAirline);
    assert.equal(result, true, "Airline should have been active");

    result = await config.flightSuretyData.isAirlineActive.call(fourthAirline);
    assert.equal(result, true, "Airline should have been active");
  });

  it('(airline) Fifth and subsequent Airlines need voting during activation', async () => {
    
    // ARRANGE
   fifthAirline = accounts[5];
   sixthAirline = accounts[6];
   try {
       await config.flightSuretyApp.registerAirline(fifthAirline, {from: config.firstAirline});
       await config.flightSuretyApp.registerAirline(sixthAirline, {from: config.firstAirline});
     }
    catch(e) {
        console.log(e);
        assert.fail("Exception not expected");
    }
    result = await config.flightSuretyData.isAirlineVoted.call(fifthAirline);
    assert.equal(result, false, "Airline should have not been voted");

    result = await config.flightSuretyData.isAirlineVoted.call(sixthAirline);
    assert.equal(result, false, "Airline should have not been voted");

  });
  it('(airline) Airlines waiting for votes, get voted once 50% of active airlines register it/vote it', async () => {
    
    // ARRANGE
    fifthAirline = accounts[5];
    result = await config.flightSuretyData.isAirlineVoted.call(fifthAirline);
    assert.equal(result, false, "Airline should have not been voted");
    
    secondAirline = accounts[2];
    await config.flightSuretyApp.registerAirline(fifthAirline, {from:secondAirline});
     //2nd airline registers fifthAirline, total votes will be 2 which is 50% of active airlines
    result = await config.flightSuretyData.isAirlineVoted.call(fifthAirline);
    assert.equal(result, true, "Airline should have not been voted");
    
});

});
