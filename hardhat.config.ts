import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from 'dotenv';
dotenv.config();

let networks = {};
if (process.env.GOERLI_PRIVATE_KEY && process.env.ALCHEMY_API_KEY) {
  networks = {
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.GOERLI_PRIVATE_KEY ?? '']
    }
  }
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: networks,
  etherscan: {
    apiKey: process.env.ETHERSCHAN_API_KEY
  }
};

export default config;