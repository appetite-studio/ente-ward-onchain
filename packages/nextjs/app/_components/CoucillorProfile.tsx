import Image from "next/image";
import { DocumentPlusIcon, LinkIcon } from "@heroicons/react/24/outline";

interface CouncillorProfileProps {
  councillorName: string;
  councillorImage: string;
  designation: string;
  contractAddress: string;
  onAddProject?: () => void;
}

export default function CouncillorProfile({
  councillorName,
  councillorImage,
  designation,
  contractAddress,
  onAddProject,
}: CouncillorProfileProps) {
  // Function to get block explorer URL
  const getBlockExplorerUrl = (address: string) => {
    if (typeof window !== "undefined") {
      const chainId = window.ethereum?.chainId;

      switch (chainId) {
        case "0x1": // Ethereum Mainnet
          return `https://etherscan.io/address/${address}`;
        case "0x89": // Polygon Mainnet
          return `https://polygonscan.com/address/${address}`;
        case "0x13881": // Polygon Mumbai Testnet
          return `https://mumbai.polygonscan.com/address/${address}`;
        case "0xaa36a7": // Ethereum Sepolia Testnet
          return `https://sepolia.etherscan.io/address/${address}`;
        case "0x7a69": // Local Hardhat Network
          return `#`; // No explorer for local network
        default:
          return `https://etherscan.io/address/${address}`; // Default to Ethereum
      }
    }
    return `https://etherscan.io/address/${address}`; // Default fallback
  };

  // Function to handle contract address click
  const handleContractClick = () => {
    const explorerUrl = getBlockExplorerUrl(contractAddress);
    if (explorerUrl !== "#") {
      window.open(explorerUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Function to format contract address for display
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="text-center pt-12 pb-8 lg:pb-12 px-4 border-b-2 lg:border-b-0 lg:border-r-2 border-neutral-100 flex items-center justify-center">
      <div className="space-y-4">
        <div className="avatar">
          <div className="ring-primary ring-offset-base-100 w-24 rounded-full ring-2 ring-offset-2">
            <Image height="100" width="100" src={councillorImage} alt={councillorName} />
          </div>
        </div>
        <div>
          <h3>Welcome,</h3>
          <h1>{councillorName}</h1>
        </div>
        <div className="w-fit py-2 px-4 mx-auto rounded-full border-2 border-neutral-200">
          <span className="text-xs lg:text-base">{designation}</span>
        </div>

        {/* Contract Address */}
        <div className="flex flex-col items-center space-y-1">
          <button
            onClick={handleContractClick}
            className="text-xs text-base-content/40 hover:text-primary transition-colors duration-200 flex items-center gap-1"
            title={`View contract on block explorer: ${contractAddress}`}
          >
            <span className="font-mono">{formatAddress(contractAddress)}</span>
            <LinkIcon className="h-3 w-3" />
          </button>
        </div>

        <button className="mt-4 btn btn-primary" onClick={onAddProject}>
          <DocumentPlusIcon className="h-6" /> Add a Project
        </button>
      </div>
    </div>
  );
}
