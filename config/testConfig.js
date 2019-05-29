
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0x0896e1E4345c046D8Cfcc502df3d269eE9DA51FD",
        "0x4841a21837AA0c72b318f91b24aD42a4A661E3f5",
        "0x2484D4d97eb04816645adE2e44d07bbb8D670C82",
        "0x0E020eE8234705e1C808f83326432A304eF261d4",
        "0x83ACd495e81aD25086D173c4c3dc47f39e9b8eb8",
        "0xe007f15c24a55df72616aB8DFaFEC2cF09bc873C",
        "0xF9A305c88958E5C388984E559C5046c91E7a3e9f",
        "0x757756440d44953910Dd151e476a3734984D901d",
        "0xABe07Bc1ab7a183F6671BfCff30f7E9aB4CC42dF"
    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];

    let flightSuretyData = await FlightSuretyData.new(firstAirline);
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);

    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};