"use client";

import { useEffect, useState } from "react";
import CouncillorProfile from "./_components/CoucillorProfile";
import LoginPage from "./_components/LoginPage";
import NotAuthorized from "./_components/NotAuthorized";
import ProjectProposalForm from "./_components/ProjectProposalForm";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import LoadingSpinner from "~~/components/LoadingSpinner";

interface Municipality {
  id: number;
  name: string;
}

interface Ward {
  id: number;
  ward_name: string;
  ward_councillor: number;
  contractAddress: string;
  muncipality: Municipality;
}

interface CouncilorData {
  id: number;
  councilorName: string;
  emailAddress: string;
  facebookProfileLink: string;
  instagramProfileLink: string;
  councilorNumber: string;
  whatsapp_link: string;
  councilorImage: string;
  wallet_address: string;
  ward: Ward;
}

interface DirectusResponse {
  data: CouncilorData[];
}

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  const [councillorData, setCouncillorData] = useState<CouncilorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProposalFormOpen, setIsProposalFormOpen] = useState(false);

  const fetchCouncillorData = async (walletAddress: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const directusCouncillorAPI = `${process.env.NEXT_PUBLIC_DIRECTUS_BASE_URL}/items/councilor_details?filter[wallet_address][_eq]=${walletAddress}&fields=*,ward.*,ward.muncipality.*`;

      const response = await fetch(directusCouncillorAPI);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: DirectusResponse = await response.json();

      if (result.data && result.data.length > 0) {
        setCouncillorData(result.data[0]);
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } catch (err) {
      console.error("Error fetching councillor data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch councillor data");
      setIsAuthorized(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProject = () => {
    setIsProposalFormOpen(true);
  };

  const handleProposalSubmit = (metadataLink: string) => {
    console.log("Project Proposal Metadata IPFS Link:", metadataLink);
    // You can add additional logic here, such as:
    // - Store the proposal in your database
    // - Show a success notification
    // - Refresh the councillor's project list
    alert("Project proposal submitted successfully! Check console for IPFS link.");
  };

  useEffect(() => {
    if (connectedAddress) {
      fetchCouncillorData(connectedAddress);
    } else {
      // Reset state when wallet disconnects
      setCouncillorData(null);
      setIsAuthorized(null);
      setError(null);
    }
  }, [connectedAddress]);

  // No wallet connected
  if (!connectedAddress) {
    return <LoginPage />;
  }

  // Loading state
  if (isLoading) {
    return <LoadingSpinner message="Loading..." />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
          <h2 className="text-red-800 text-lg font-semibold mb-2">Error Loading Data</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => connectedAddress && fetchCouncillorData(connectedAddress)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Not authorized
  if (isAuthorized === false) {
    return <NotAuthorized />;
  }

  // Authorized and data loaded
  if (councillorData && isAuthorized) {
    const councillorImageUrl = councillorData.councilorImage
      ? `${process.env.NEXT_PUBLIC_DIRECTUS_BASE_URL}/assets/${councillorData.councilorImage}`
      : "/images/temp-councillor-avatar.png";

    const designation = `${councillorData.ward.ward_name}, ${councillorData.ward.muncipality.name} Municipality`;

    return (
      <>
        <div className="grid lg:grid-cols-2 flex-1">
          <CouncillorProfile
            councillorName={councillorData.councilorName}
            councillorImage={councillorImageUrl}
            designation={designation}
            onAddProject={handleAddProject}
          />
        </div>

        {/* Project Proposal Form Modal */}
        <ProjectProposalForm
          isOpen={isProposalFormOpen}
          onClose={() => setIsProposalFormOpen(false)}
          onSubmit={handleProposalSubmit}
        />
      </>
    );
  }

  return <LoadingSpinner message="Initializing..." />;
};

export default Home;
