"use client";

import { useEffect, useState } from "react";
import AllProjects from "./_components/AllProjects";
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
  const [refreshProjects, setRefreshProjects] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const fetchCouncillorData = async (walletAddress: string, isRetry = false) => {
    if (!isRetry) {
      setIsLoading(true);
      setError(null);
    }

    try {
      // Validate environment variables
      if (!process.env.NEXT_PUBLIC_DIRECTUS_BASE_URL) {
        throw new Error("Directus API URL is not configured. Please check your environment variables.");
      }

      // Validate wallet address format
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        throw new Error("Invalid wallet address format.");
      }

      const directusCouncillorAPI = `${process.env.NEXT_PUBLIC_DIRECTUS_BASE_URL}/items/councilor_details?filter[wallet_address][_eq]=${walletAddress}&fields=*,ward.*,ward.muncipality.*`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(directusCouncillorAPI, {
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Councillor data not found. Please ensure your wallet is registered.");
        } else if (response.status >= 500) {
          throw new Error("Server error. Please try again later.");
        } else if (response.status === 403) {
          throw new Error("Access denied. Please check your permissions.");
        } else {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
      }

      const result: DirectusResponse = await response.json();

      if (!result.data || !Array.isArray(result.data)) {
        throw new Error("Invalid response format from server.");
      }

      if (result.data.length === 0) {
        setIsAuthorized(false);
        setError("Your wallet address is not registered as a councillor. Please contact your administrator.");
      } else {
        const councillor = result.data[0];

        // Validate required fields
        if (!councillor.ward?.contractAddress) {
          throw new Error("Contract address not configured for your ward. Please contact your administrator.");
        }

        if (!/^0x[a-fA-F0-9]{40}$/.test(councillor.ward.contractAddress)) {
          throw new Error("Invalid contract address format in database. Please contact your administrator.");
        }

        setCouncillorData(councillor);
        setIsAuthorized(true);
        setRetryCount(0); // Reset retry count on success
      }
    } catch (err) {
      console.error("Error fetching councillor data:", err);

      let errorMessage = "Failed to load councillor data.";

      if (err instanceof Error) {
        if (err.name === "AbortError") {
          errorMessage = "Request timed out. Please check your internet connection and try again.";
        } else if (err.message.includes("NetworkError") || err.message.includes("fetch")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setIsAuthorized(false);
    } finally {
      if (!isRetry) {
        setIsLoading(false);
      }
    }
  };

  const handleRetry = () => {
    if (connectedAddress) {
      setRetryCount(prev => prev + 1);
      fetchCouncillorData(connectedAddress, true);
    }
  };

  const handleAddProject = () => {
    setIsProposalFormOpen(true);
  };

  const handleProposalSubmit = (result: string) => {
    console.log("Project proposal result:", result);
    // Trigger refresh of projects list
    setRefreshProjects(prev => prev + 1);

    if (result.includes("successfully")) {
      // Show success notification
      // You can integrate with a toast library here
      console.log("✅ Project created successfully!");
    }
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

  // Error state with retry functionality
  if (error) {
    return (
      <div className="flex items-center justify-center flex-1 p-4">
        <div className="max-w-md w-full">
          <div className="text-center p-6 bg-error/10 rounded-lg border border-error/20">
            <div className="w-16 h-16 mx-auto mb-4 bg-error/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-error text-lg font-semibold mb-3">Unable to Load Data</h2>
            <p className="text-error/80 mb-6 text-sm leading-relaxed">{error}</p>

            <div className="space-y-3">
              <button onClick={handleRetry} disabled={isLoading} className="btn btn-error btn-sm w-full">
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Retrying...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Try Again
                  </>
                )}
              </button>

              {retryCount > 2 && (
                <div className="text-xs text-base-content/60 p-3 bg-base-200 rounded">
                  <p className="font-medium mb-1">Still having issues?</p>
                  <ul className="space-y-1 text-left">
                    <li>• Check your internet connection</li>
                    <li>• Verify your wallet is connected</li>
                    <li>• Contact your administrator</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
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
        <div className="grid lg:grid-cols-2 flex-1 gap-6">
          <CouncillorProfile
            councillorName={councillorData.councilorName}
            councillorImage={councillorImageUrl}
            designation={designation}
            contractAddress={councillorData.ward.contractAddress}
            onAddProject={handleAddProject}
          />

          <AllProjects contractAddress={councillorData.ward.contractAddress} refreshTrigger={refreshProjects} />
        </div>

        {/* Project Proposal Form Modal */}
        <ProjectProposalForm
          isOpen={isProposalFormOpen}
          onClose={() => setIsProposalFormOpen(false)}
          onSubmit={handleProposalSubmit}
          contractAddress={councillorData.ward.contractAddress}
        />
      </>
    );
  }

  return <LoadingSpinner message="Initializing..." />;
};

export default Home;
