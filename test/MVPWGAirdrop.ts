import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber, utils } from "ethers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

describe("MVPWGAirdrop", function () {
    async function deployContracts() {
        const availableSigners = await ethers.getSigners();
        const whitelistedAddress = availableSigners
            .map(function( signer: SignerWithAddress, ) {
                return signer.address
            })
            .splice(0, 5);

        const nodes = whitelistedAddress.map((x) =>
            utils.solidityKeccak256(["address"], [x])
        );

        const merkleTree = new MerkleTree(nodes, keccak256, { sort: true });
        const root = merkleTree.getHexRoot();
        // Deploy contracts
        const MVPWGauntlet = await ethers.getContractFactory('MVPWGauntlet');
        const gauntlet = await MVPWGauntlet.deploy();
        await gauntlet.deployed();
        
        const MVPWGAirdrop = await ethers.getContractFactory("MVPWGAirdrop");
        const airdrop = await MVPWGAirdrop.deploy(root, gauntlet.address);
        await airdrop.deployed();

        // grant minter role to airdrop contract
        const tsx = await gauntlet.grantRole(keccak256('MINTER_ROLE'), airdrop.address);
        await tsx.wait(1);

        return { whitelistedAddress, nodes, availableSigners, merkleTree, root, gauntlet, airdrop };
    }

    it("should claim successfully", async () => {
        const { whitelistedAddress, nodes, availableSigners, merkleTree, airdrop, gauntlet } = await loadFixture(deployContracts);
        const proof = merkleTree.getHexProof(nodes[3]);

        // Attempt to claim and verify success
        await expect(airdrop.connect(availableSigners[3]).claim(proof))
            .to.emit(airdrop, "Claimed")
            .withArgs(whitelistedAddress[3]);

        // check balance
        const balance = await gauntlet.balanceOf(whitelistedAddress[3]);
        await expect(balance.toNumber())
            .to.be.eq(BigNumber.from('1').toNumber());

        // try to claim twice
        await expect(airdrop.connect(availableSigners[3]).claim(proof))
            .to.be.revertedWith("Already claimed!")
    });

    it("should throw for invalid proof", async () => {
        const { availableSigners, airdrop, merkleTree } = await loadFixture(deployContracts);

        // call with invalid proof
        await expect(airdrop.connect(availableSigners[2]).claim([]))
            .to.be.revertedWith("Invalid proof.");
        const proof = merkleTree.getHexProof(availableSigners[10].address);

        // call with non-legit address
        await expect(airdrop.connect(availableSigners[10]).claim(proof))
            .to.be.revertedWith("Invalid proof.");
    });
});