import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import * as readline from "readline";

/**
 * Prompts user for input via command line
 * @param question The question to ask the user
 * @returns Promise resolving to user's input
 */
function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Validates if a string is a valid Ethereum address
 * @param address The address to validate
 * @returns boolean indicating if address is valid
 */
function isValidAddress(address: string): boolean {
  try {
    // Use Hardhat's ethers which is available in the runtime environment
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  } catch {
    return false;
  }
}

/**
 * Deploys a contract named "EntewardProject" using the deployer account and
 * constructor arguments set to the provided initial owner address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployEntewardProject: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` or `yarn account:import` to import your
    existing PK which will fill DEPLOYER_PRIVATE_KEY_ENCRYPTED in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("🚀 Deploying EntewardProject contract...");
  console.log(`📡 Network: ${hre.network.name}`);
  console.log(`👤 Deployer: ${deployer}`);
  console.log();

  // Get initial owner address from user input
  let initialOwner = "";

  while (!initialOwner) {
    const userInput = await askQuestion(`🔑 Enter the initial owner address for the EntewardProject contract: `);

    if (!userInput) {
      console.log("❌ Address cannot be empty. Please try again.\n");
      continue;
    }

    if (!isValidAddress(userInput)) {
      console.log("❌ Invalid Ethereum address format. Please try again.\n");
      continue;
    }

    // Confirm the address
    console.log(`\n📋 Initial Owner: ${userInput}`);
    const confirmation = await askQuestion("✅ Is this correct? (y/n): ");

    if (confirmation.toLowerCase() === "y" || confirmation.toLowerCase() === "yes") {
      initialOwner = userInput;
      console.log();
    } else {
      console.log("🔄 Let's try again...\n");
    }
  }

  console.log("⏳ Deploying contract...");

  const deployResult = await deploy("EntewardProject", {
    from: deployer,
    // Contract constructor arguments
    args: [initialOwner],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  if (deployResult.newlyDeployed) {
    console.log();
    console.log("🎉 EntewardProject deployed successfully!");
    console.log(`📄 Contract Address: ${deployResult.address}`);
    console.log(`🔑 Initial Owner: ${initialOwner}`);
    console.log(`⛽ Gas Used: ${deployResult.receipt?.gasUsed?.toString() || "N/A"}`);

    // Note: Gas price info may not be available in hardhat-deploy receipt
    // For accurate cost calculation, you'd need to query the transaction separately
    console.log(`💰 Deploy Cost: Check transaction hash on block explorer for exact cost`);
  } else {
    console.log("ℹ️  Contract already deployed at:", deployResult.address);
  }

  // Optional: Get the deployed contract instance for testing
  // const entewardProject = await hre.ethers.getContract("EntewardProject", deployer);
  // const contractOwner = await entewardProject.owner();
  // console.log("✅ Contract owner verification:", contractOwner === initialOwner ? "PASSED" : "FAILED");
};

export default deployEntewardProject;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags EntewardProject
deployEntewardProject.tags = ["EntewardProject"];
