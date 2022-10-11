import { ethers, network } from "hardhat";
import { utils, Contract, BigNumber } from "ethers";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// @ts-ignore
import ABI from '../abis/MvpwAirlinesToken.abi.json';

// list all MVPW Airline holders by filtering `Transfer` event and check address balance
// its also possible to just write simple array based on https://goerli.etherscan.io/token/0x71bDd3e52B3E4C154cF14f380719152fd00362E7#balances
async function getMvpwAirlineTokenHolders() {
    const signers = await ethers.getSigners();
    const contract = new Contract('0x71bDd3e52B3E4C154cF14f380719152fd00362E7', ABI, signers[0]);
    const transactions = await contract.queryFilter(contract.filters.Transfer());
    const addresses = transactions
        // return just addresses
        .map((block) => block.args?.to )
        // keep unique addresses only
        .filter((address: string, i: number, ar: string[] ) => ar.indexOf(address) === i);
    // tried same inside .filter()
    // but keeps getting weird CALL_EXCEPTION error https://docs.ethers.io/v5/troubleshooting/errors/#help-CALL_EXCEPTION
    // decided to go with simple recursive function at the end
    const filterAddressesByBalance = async function (startIndex: number, addresses: string[] = [], arr: any[] = []): Promise<any> {
        if (startIndex < addresses.length && addresses[startIndex]) {
            const address = addresses[startIndex];
            const balance = await contract.balanceOf(address);
            if (+BigNumber.from(balance).toString() > 0) arr.push(address);
            return filterAddressesByBalance(startIndex+1, addresses, arr);
        }
    }
    const whitelistedAddress: string[] = [];
    await filterAddressesByBalance(0, addresses, whitelistedAddress);

    return whitelistedAddress;
}

async function main() {
    let whitelistedAddresses: string[] = [];

    if (network.name === 'goerli') {
        whitelistedAddresses = await getMvpwAirlineTokenHolders();
    }
    
    if (network.name === 'hardhat') {
        const availableSigners = await ethers.getSigners();
        whitelistedAddresses = availableSigners
            .map(function( signer: SignerWithAddress, ) {
                return signer.address
            })
            .splice(0, 5);
    }

    const nodes = whitelistedAddresses.map((x) =>
        utils.solidityKeccak256(["address"], [x])
    );

    const merkleTree = new MerkleTree(nodes, keccak256, { sort: true });
    const root = merkleTree.getHexRoot();
    // Deploy contracts
    const MVPWGauntlet = await ethers.getContractFactory('MVPWGauntlet');
    const gauntlet = await MVPWGauntlet.deploy();
    await gauntlet.deployed();
    console.log(`MVPWGauntlet deployed, address: ${gauntlet.address}`);
    console.log(`MVPWGauntlet etherscan, https://${network.name}.etherscan.io/address/${gauntlet.address}`);
    const MVPWGAirdrop = await ethers.getContractFactory("MVPWGAirdrop");
    const airdrop = await MVPWGAirdrop.deploy(root, gauntlet.address);
    await airdrop.deployed();
    console.log(`MVPWGAirdrop deployed, address: ${airdrop.address}`);
    console.log(`MVPWGAirdrop etherscan, https://${network.name}.etherscan.io/address/${airdrop.address}`);

    // grant minter role to airdrop contract
    const tsx = await gauntlet.grantRole(keccak256('MINTER_ROLE'), airdrop.address);
    await tsx.wait(1);
    console.log(`Airdrop ( ${airdrop.address} ) granted MINTER_ROLE for MVPWGauntlet ( ${gauntlet.address} )`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});