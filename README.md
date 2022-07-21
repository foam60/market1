# NFT Marketplace Annual Project ESGI

## Technology Stack & Tools
- Solidity (Writing Smart Contract)
- Javascript (React & Testing)
- [Ethers](https://docs.ethers.io/v5/) (Blockchain Interaction)
- [Hardhat](https://hardhat.org/) (Development Framework)
- [Ipfs](https://ipfs.io/) (Metadata storage)
- [React routers](https://v5.reactrouter.com/) (Navigational components)

## Setting Up
### 1. Clone/Download the Repository

### 2. Install Dependencies:
```
$ cd nft_marketplace
$ npm install
```
### 3. Boot up local development blockchain
```
$ npx hardhat node
```

### 4. Add local accounts to metamask Localhost

### 5. Migrate Smart Contracts
`npx hardhat run src/backend/scripts/deploy.js --network localhost`

### 6. Run Tests
`npx hardhat test`

### 7. Launch Frontend
`npm run start`

