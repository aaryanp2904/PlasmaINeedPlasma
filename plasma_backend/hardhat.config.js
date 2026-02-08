require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    plasmaTestnet: {
      url: process.env.RPC_ENDPOINT || process.env.RPC_URL,
      chainId: 9746,
      accounts: [process.env.PRIVATE_KEY], // We'll set this up next.
    },
  },
};
