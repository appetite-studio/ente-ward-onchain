<h1 align="center"> 🏛️ Ente Ward </h1>
<p align="center">Power to the people. <a target="_blank" href="https://enteward.app">enteward.app</a></p>

<h4 align="center">
  <a href="#features">Features</a> |
  <a href="#smart-contract">Smart Contract</a> |
  <a href="#quickstart">Quickstart</a> |
  <a href="#deployment">Deployment</a>
</h4>

🌟 A blockchain-powered platform that bridges the communication gap between citizens and their local representatives through transparent, immutable project tracking and community engagement.

⚡ Built using NextJS, RainbowKit, Hardhat, Wagmi, Viem, and Typescript on Scaffold-ETH 2.

## Why Ente Ward?

We believe that effective and transparent communication is crucial for community development. Ente ward empowers residents to voice concerns, track project progress, and actively participate in neighborhood improvement while ensuring unprecedented transparency through blockchain technology.

## 🚀 Features

- **📋 Project Management**: Create, track, and update community projects with immutable blockchain records
- **🔒 Transparent Governance**: Blockchain-secured project documentation prevents tampering and corruption
- **📊 Status Tracking**: Real-time project status updates (Upcoming → Ongoing → Completed/Cancelled)
- **📝 Immutable Reports**: Mandatory completion reports for finished projects
- **🚫 Non-Transferable**: Project NFTs remain permanently with local representatives
- **📱 Community Engagement**: Platform for reporting issues, donations, and local news

## 🔗 Smart Contract

### EntewardProject Contract

An ERC721-based smart contract that represents each community project as a non-transferable NFT:

**Key Features:**
- **Project Status Management**: Enforced workflow transitions
- **Immutable Records**: Proposal and report URIs stored on-chain
- **Access Control**: Only contract owner can create/update projects
- **Gas Optimized**: Custom errors and efficient data structures
- **Transfer Prevention**: Projects cannot be moved or sold

**Contract Functions:**
```solidity
// Create new project
function safeMint(string proposalURI) external onlyOwner returns (uint256)

// Update project status with optional report
function updateStatus(uint256 tokenId, ProjectStatus newStatus, string reportURI) external onlyOwner

// Get paginated projects (newest first)
function getProjects(uint256 projectsPerPage, uint256 page) external view

// Get specific project details
function getProject(uint256 tokenId) external view returns (ProjectStatus, string, string)
```

## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## Quickstart

To get started with Ente Ward development:

1. **Install dependencies:**
```bash
yarn install
```

2. **Start local blockchain:**
```bash
yarn chain
```

3. **Deploy the EntewardProject contract:**
```bash
yarn deploy
```
*You'll be prompted to enter the initial owner address for the contract*

4. **Start the frontend:**
```bash
yarn start
```

Visit your app on: `http://localhost:3000`

## 🚀 Deployment

### Local Development
```bash
# Deploy to local hardhat network
yarn deploy

# Deploy to specific network
yarn deploy --network sepolia
```

### Production Deployment

1. **Configure Network**: Update `packages/hardhat/hardhat.config.ts` with your network settings
2. **Set Private Key**: Add your deployer private key to environment variables
3. **Deploy Contract**: Run deployment script with network flag
4. **Verify Contract**: Submit source code to block explorer for transparency

**Interactive Deployment:**
The deploy script will prompt you for:
- Initial owner address (local representative's wallet)
- Confirmation of address before deployment
- Network verification and gas estimation

## 🧪 Testing

Run the smart contract test suite:
```bash
yarn hardhat:test
```

Test contract functions using the Debug Contracts page at `http://localhost:3000/debug`

## 📁 Project Structure

```
packages/
├── hardhat/
│   ├── contracts/
│   │   └── EntewardProject.sol    # Main project contract
│   ├── deploy/
│   │   └── 00_deploy_enteward.ts  # Interactive deployment script
│   └── test/                      # Contract tests
├── nextjs/
│   ├── app/
│   │   └── page.tsx              # Frontend homepage
│   └── scaffold.config.ts        # App configuration
```

## 🔧 Development

- **Edit Smart Contracts**: `packages/hardhat/contracts/`
- **Edit Frontend**: `packages/nextjs/app/`
- **Edit Deployment Scripts**: `packages/hardhat/deploy/`
- **Configure App**: `packages/nextjs/scaffold.config.ts`

## 🌍 Why Blockchain?

**Transparency**: All project records are publicly verifiable and cannot be altered
**Accountability**: Immutable audit trail of all project decisions and outcomes
**Trust**: Reduces corruption through permanent, tamper-proof documentation
**Community Engagement**: Citizens can independently verify project progress and spending

## 🛡️ Security Features

- **Access Control**: Only authorized representatives can manage projects
- **Input Validation**: Comprehensive checks prevent invalid data
- **Status Enforcement**: Projects follow strict lifecycle rules
- **Transfer Prevention**: Projects remain permanently with representatives
- **Gas Optimization**: Efficient operations reduce transaction costs

## 🤝 Contributing

We welcome contributions to Ente Ward! Whether it's:
- 🐛 Bug fixes
- ✨ New features
- 📚 Documentation improvements
- 🧪 Additional tests

Please ensure your contributions align with our mission of transparent, accountable local governance.

## 📄 License

This project is built on Scaffold-ETH 2 and follows the same open-source principles for community development and transparency.

---

**Ente Ward.** Built at appetite.studio