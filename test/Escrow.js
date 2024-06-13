const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Escrow', () => {
    let seller, buyer, realEstate, inspector, lender, escrow;
    const mockNfcId = 1;

    beforeEach(async () => {
        [buyer, seller, inspector, lender] = await ethers.getSigners();

        // Deploy Real Estate
        const RealEstate = await ethers.getContractFactory('RealEstate');
        realEstate = await RealEstate.deploy();

        // Mint
        let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS");
        await transaction.wait();

        const Escrow = await ethers.getContractFactory('Escrow');

        escrow = await Escrow.deploy(realEstate.address, seller.address, inspector.address, lender.address);

        // Approve property
        transaction = await realEstate.connect(seller).approve(escrow.address, mockNfcId);
        await transaction.wait();

        // List property
        transaction = await escrow.connect(seller).list(mockNfcId, buyer.address, tokens(10), tokens(5));
        await transaction.wait();
    })
    describe('Deployment', () => {
        it('Returns NFT address', async () => {
            const result = await escrow.nftAddress();
            expect(result).to.be.equal(realEstate.address);
        })

        it('Returns seller', async () => {
            const result = await escrow.seller();
            expect(result).to.be.equal(seller.address);
        })

        it('Returns inspector', async () => {
            const result = await escrow.inspector();
            expect(result).to.be.equal(inspector.address);
        })

        it('Returns lender', async () => {
            const result = await escrow.lender();
            expect(result).to.be.equal(lender.address);
        })
    })

    describe('Listing', () => {
        it('Updates ownership', async () => {
            expect(await realEstate.ownerOf(mockNfcId)).to.be.equal(escrow.address);
        })

        it('Updates as listed', async () => {
            const result = await escrow.isListed(mockNfcId);
            expect(result).to.be.equal(true);
        })

        it('Returns buyer', async () => {
            const result = await escrow.buyer(mockNfcId);
            expect(result).to.be.equal(buyer.address);
        })

        it('Returns purchase price', async () => {
            const result = await escrow.purchasePrice(mockNfcId);
            expect(result).to.be.equal(tokens(10));
        })

        it('Returns escrow amount', async () => {
            const result = await escrow.escrowAmount(mockNfcId);
            expect(result).to.be.equal(tokens(5));
        })
    })

    describe('Deposits', () => {
        it('Updates contract balance', async () => {
            const transaction = await escrow.connect(buyer).depositEarnest(mockNfcId, { value: tokens(5) })
            await transaction.wait();
            const result = await escrow.getBalance();
            expect(result).to.be.equal(tokens(5));
        })
    })

    describe('Inspection', () => {
        it('Updates inspection status', async () => {
            const transaction = await escrow.connect(inspector).updateInspectionStatus(mockNfcId, true)
            await transaction.wait();
            const result = await escrow.inspectionPassed(mockNfcId);
            expect(result).to.be.equal(true);
        })
    })

    describe('Approval', () => {
        it('Updates approval status', async () => {
            let transaction = await escrow.connect(buyer).approveSale(mockNfcId);
            await transaction.wait();

            transaction = await escrow.connect(seller).approveSale(mockNfcId);
            await transaction.wait();

            transaction = await escrow.connect(lender).approveSale(mockNfcId);
            await transaction.wait();

            expect(await escrow.approval(mockNfcId, buyer.address)).to.be.equal(true);
            expect(await escrow.approval(mockNfcId, seller.address)).to.be.equal(true);
            expect(await escrow.approval(mockNfcId, lender.address)).to.be.equal(true);
        })
    })

    describe('Sale', async () => {
        beforeEach(async () => {
            let transaction = await escrow.connect(buyer).depositEarnest(mockNfcId, { value: tokens(5) })
            await transaction.wait();

            transaction = await escrow.connect(inspector).updateInspectionStatus(mockNfcId, true)
            await transaction.wait();

            transaction = await escrow.connect(buyer).approveSale(mockNfcId);
            await transaction.wait();

            transaction = await escrow.connect(seller).approveSale(mockNfcId);
            await transaction.wait();

            transaction = await escrow.connect(lender).approveSale(mockNfcId);
            await transaction.wait();

            await lender.sendTransaction({ to: escrow.address, value: tokens(5) });

            transaction = await escrow.connect(seller).finalizeSale(mockNfcId);
            await transaction.wait();
        })

        it('Updates ownership', async () => {
            expect(await realEstate.ownerOf(mockNfcId)).to.be.equal(buyer.address);
        })

        it('Updates balance', async () => {
            expect(await escrow.getBalance()).to.be.equal(0);
        })
    })
})
