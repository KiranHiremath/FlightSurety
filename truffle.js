var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "candy brand render flush biology urban bounce shift neck forward citizen during";

module.exports = {
  networks: {
    /*development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
      },
      network_id: '*',
      gas: 9999999
    }*/
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // Match any network id
      gas: 9999999
    },
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};