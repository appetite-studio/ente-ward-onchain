"use client";

import { JSX, useEffect, useState } from "react";
import Image from "next/image";
import { useReadContract } from "wagmi";
import {
  CalendarDaysIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  FolderIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "~~/components/LoadingSpinner";

// Project status enum matching the smart contract
enum ProjectStatus {
  Upcoming = 0,
  Ongoing = 1,
  Cancelled = 2,
  Completed = 3,
}

interface ProjectData {
  tokenId: number;
  status: ProjectStatus;
  proposalURI: string;
  reportURI: string;
}

interface ProjectMetadata {
  proposalDate: string;
  proposalImage: string;
  title: string;
  description: string;
  estimatedCost: string;
  proposalPDF: string;
}

interface AllProjectsProps {
  contractAddress: string;
  refreshTrigger: number;
}

// Smart contract ABI for reading projects
const CONTRACT_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "projectsPerPage",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "page",
        type: "uint256",
      },
    ],
    name: "getProjects",
    outputs: [
      {
        internalType: "uint256[]",
        name: "tokenIds",
        type: "uint256[]",
      },
      {
        internalType: "enum EntewardProject.ProjectStatus[]",
        name: "statuses",
        type: "uint8[]",
      },
      {
        internalType: "string[]",
        name: "proposalURIs",
        type: "string[]",
      },
      {
        internalType: "string[]",
        name: "reportURIs",
        type: "string[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalProjects",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// No custom hook needed - scaffold hooks are simpler to use directly
const PROJECTS_PER_PAGE = 6;

const AllProjects: React.FC<AllProjectsProps> = ({ contractAddress, refreshTrigger }) => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [projectsWithMetadata, setProjectsWithMetadata] = useState<
    (ProjectData & { metadata: ProjectMetadata | null })[]
  >([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [filterStatus, setFilterStatus] = useState<"all" | "proposals" | "completed">("all");
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataErrors, setMetadataErrors] = useState<Record<number, string>>({});
  const [contractError, setContractError] = useState<string | null>(null);

  // Get total projects count using wagmi hook
  const {
    data: totalProjects,
    refetch: refetchTotal,
    isError: totalProjectsError,
    error: totalProjectsErrorDetails,
  } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getTotalProjects",
  });

  // Get projects for current page using wagmi hook
  const {
    data: projectsData,
    refetch: refetchProjects,
    isLoading: isLoadingProjects,
    isError: projectsDataError,
    error: projectsDataErrorDetails,
  } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getProjects",
    args: [BigInt(PROJECTS_PER_PAGE), BigInt(currentPage)],
    query: {
      enabled: totalProjects !== undefined && totalProjects > 0,
    },
  });

  // Monitor contract errors
  useEffect(() => {
    if (totalProjectsError || projectsDataError) {
      let errorMessage = "Failed to load projects from blockchain.";

      const error = totalProjectsErrorDetails || projectsDataErrorDetails;
      if (error) {
        if (error.message.includes("network") || error.message.includes("NetworkError")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message.includes("execution reverted")) {
          errorMessage = "Contract error. The contract may not be deployed or accessible.";
        } else if (error.message.includes("invalid address")) {
          errorMessage = "Invalid contract address. Please contact your administrator.";
        }
      }

      setContractError(errorMessage);
    } else {
      setContractError(null);
    }
  }, [totalProjectsError, projectsDataError, totalProjectsErrorDetails, projectsDataErrorDetails]);

  // Fetch metadata from IPFS with error handling
  const fetchMetadata = async (uri: string, tokenId: number): Promise<ProjectMetadata | null> => {
    try {
      if (!uri || uri.trim() === "") {
        throw new Error("Empty metadata URI");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(uri, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Invalid content type - expected JSON");
      }

      const metadata = await response.json();

      // Validate required fields
      if (!metadata.title || !metadata.description) {
        throw new Error("Missing required metadata fields");
      }

      return metadata;
    } catch (error) {
      console.error(`Error fetching metadata for token ${tokenId}:`, error);

      let errorMessage = "Failed to load project details";
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Request timed out";
        } else if (error.message.includes("NetworkError")) {
          errorMessage = "Network error";
        } else if (error.message.includes("HTTP 404")) {
          errorMessage = "Metadata not found";
        } else if (error.message.includes("JSON")) {
          errorMessage = "Invalid metadata format";
        }
      }

      setMetadataErrors(prev => ({ ...prev, [tokenId]: errorMessage }));
      return null;
    }
  };

  // Process projects data when it changes
  useEffect(() => {
    if (projectsData) {
      try {
        const [tokenIds, statuses, proposalURIs, reportURIs] = projectsData;

        if (!tokenIds || !statuses || !proposalURIs || !reportURIs) {
          throw new Error("Invalid projects data structure");
        }

        if (
          tokenIds.length !== statuses.length ||
          tokenIds.length !== proposalURIs.length ||
          tokenIds.length !== reportURIs.length
        ) {
          throw new Error("Mismatched projects data arrays");
        }

        const processedProjects: ProjectData[] = tokenIds.map((tokenId, index) => ({
          tokenId: Number(tokenId),
          status: statuses[index],
          proposalURI: proposalURIs[index],
          reportURI: reportURIs[index],
        }));

        setProjects(processedProjects);
        setMetadataErrors({}); // Clear previous metadata errors
      } catch (error) {
        console.error("Error processing projects data:", error);
        setContractError("Invalid data received from contract");
      }
    }
  }, [projectsData]);

  // Fetch metadata for all projects with error handling
  useEffect(() => {
    const loadMetadata = async () => {
      if (projects.length === 0) {
        setProjectsWithMetadata([]);
        return;
      }

      setIsLoadingMetadata(true);

      try {
        const projectsWithMeta = await Promise.allSettled(
          projects.map(async project => {
            const metadata = await fetchMetadata(project.proposalURI, project.tokenId);
            return { ...project, metadata };
          }),
        );

        const successfulProjects = projectsWithMeta.map((result, index) => {
          if (result.status === "fulfilled") {
            return result.value;
          } else {
            console.error(`Failed to load metadata for project ${projects[index].tokenId}:`, result.reason);
            return { ...projects[index], metadata: null };
          }
        });

        setProjectsWithMetadata(successfulProjects);
      } catch (error) {
        console.error("Error loading metadata:", error);
        setContractError("Failed to load project metadata");
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    loadMetadata();
  }, [projects]);

  // Refresh data when trigger changes with error handling
  useEffect(() => {
    if (refreshTrigger > 0) {
      const refreshData = async () => {
        try {
          await Promise.all([refetchTotal(), refetchProjects()]);
          setCurrentPage(0); // Reset to first page
          setContractError(null); // Clear any previous errors
        } catch (error) {
          console.error("Error refreshing data:", error);
          setContractError("Failed to refresh project data");
        }
      };

      refreshData();
    }
  }, [refreshTrigger, refetchTotal, refetchProjects]);

  // Retry function for contract errors
  const handleRetryContract = async () => {
    setContractError(null);
    try {
      await Promise.all([refetchTotal(), refetchProjects()]);
    } catch (error) {
      console.error("Retry failed:", error);
      setContractError("Retry failed. Please check your connection and try again.");
    }
  };

  // Retry function for individual metadata
  const handleRetryMetadata = async (tokenId: number, proposalURI: string) => {
    setMetadataErrors(prev => ({ ...prev, [tokenId]: "" }));
    const metadata = await fetchMetadata(proposalURI, tokenId);

    setProjectsWithMetadata(prev =>
      prev.map(project => (project.tokenId === tokenId ? { ...project, metadata } : project)),
    );
  };

  // Filter projects based on status
  const filteredProjects = projectsWithMetadata.filter(project => {
    if (filterStatus === "all") return true;
    if (filterStatus === "proposals")
      return project.status === ProjectStatus.Upcoming || project.status === ProjectStatus.Ongoing;
    if (filterStatus === "completed") return project.status === ProjectStatus.Completed;
    return true;
  });

  // Get status badge styling
  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.Upcoming:
        return <span className="badge badge-info badge-sm">Upcoming</span>;
      case ProjectStatus.Ongoing:
        return <span className="badge badge-warning badge-sm">Ongoing</span>;
      case ProjectStatus.Cancelled:
        return <span className="badge badge-error badge-sm">Cancelled</span>;
      case ProjectStatus.Completed:
        return <span className="badge badge-success badge-sm">Completed</span>;
      default:
        return <span className="badge badge-ghost badge-sm">Unknown</span>;
    }
  };

  // Format cost display
  const formatCost = (cost: string) => {
    const numCost = parseFloat(cost);
    if (isNaN(numCost)) return cost;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(numCost);
  };

  // Calculate total pages
  const totalPages = totalProjects ? Math.ceil(Number(totalProjects) / PROJECTS_PER_PAGE) : 0;
  const hasMorePages = currentPage < totalPages - 1;

  const handleLoadMore = () => {
    if (hasMorePages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const isLoading = isLoadingProjects || isLoadingMetadata;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3>All Projects</h3>
          {totalProjects !== undefined && <span className="badge badge-neutral">{Number(totalProjects)}</span>}
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilterStatus("all")}
          className={`btn btn-sm ${filterStatus === "all" ? "btn-primary" : "btn-ghost border-2"}`}
        >
          All
        </button>
        <button
          onClick={() => setFilterStatus("proposals")}
          className={`btn btn-sm ${filterStatus === "proposals" ? "btn-primary" : "btn-ghost border-2"}`}
        >
          Proposals
        </button>
        <button
          onClick={() => setFilterStatus("completed")}
          className={`btn btn-sm ${filterStatus === "completed" ? "btn-primary" : "btn-ghost border-2"}`}
        >
          Completed
        </button>
      </div>

      {/* Content */}
      {contractError ? (
        // Contract Error State
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 bg-error/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-error mb-2">Unable to Load Projects</h3>
            <p className="text-error/80 mb-4 text-sm">{contractError}</p>
            <button onClick={handleRetryContract} className="btn btn-error btn-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </button>
          </div>
        </div>
      ) : totalProjects === undefined || totalProjects === 0n ? (
        // No Projects State
        <div className="text-center py-12">
          <FolderIcon className="h-16 w-16 mx-auto text-base-content/20 mb-4" />
          <h3 className="text-lg font-semibold text-base-content/60 mb-2">No Projects Yet</h3>
          <p className="text-base-content/40">Create your first project proposal to get started</p>
        </div>
      ) : isLoading && projectsWithMetadata.length === 0 ? (
        // Loading State
        <div className="flex justify-center py-12">
          <LoadingSpinner message="Loading projects..." />
        </div>
      ) : (
        <>
          {/* Projects Grid */}
          <div className="grid gap-4 mb-6">
            {filteredProjects.map(project => (
              <ProjectCard
                key={project.tokenId}
                project={project}
                getStatusBadge={getStatusBadge}
                formatCost={formatCost}
                metadataError={metadataErrors[project.tokenId]}
                onRetryMetadata={() => handleRetryMetadata(project.tokenId, project.proposalURI)}
              />
            ))}
          </div>

          {/* Load More Button */}
          {filteredProjects.length > 0 && hasMorePages && (
            <div className="text-center">
              <button onClick={handleLoadMore} disabled={isLoading} className="btn btn-outline btn-wide">
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </button>
            </div>
          )}

          {/* No filtered results */}
          {filteredProjects.length === 0 && projectsWithMetadata.length > 0 && (
            <div className="text-center py-8">
              <p className="text-base-content/60">No projects found for the selected filter</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Project Card Component with Error Handling
interface ProjectCardProps {
  project: ProjectData & { metadata: ProjectMetadata | null };
  getStatusBadge: (status: ProjectStatus) => JSX.Element;
  formatCost: (cost: string) => string;
  metadataError?: string;
  onRetryMetadata?: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  getStatusBadge,
  formatCost,
  metadataError,
  onRetryMetadata,
}) => {
  const { metadata } = project;

  return (
    <div className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="card-body p-4">
        {metadataError ? (
          // Error State for Individual Card
          <div className="flex gap-4">
            <div className="w-20 h-20 bg-error/10 rounded-lg flex items-center justify-center">
              <svg className="h-8 w-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-base">Project #{project.tokenId}</h3>
                {getStatusBadge(project.status)}
              </div>
              <p className="text-sm text-error mb-3">{metadataError}</p>
              {onRetryMetadata && (
                <button onClick={onRetryMetadata} className="btn btn-error btn-xs">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Retry
                </button>
              )}
            </div>
          </div>
        ) : (
          // Normal Card Display
          <div className="flex gap-4">
            {/* Project Image */}
            <div className="flex-shrink-0">
              {metadata?.proposalImage ? (
                <Image
                  height="160"
                  width="160"
                  src={metadata.proposalImage}
                  alt={metadata.title || "Project"}
                  className="w-20 h-20 object-cover rounded-lg"
                  onError={e => {
                    (e.target as HTMLImageElement).src = "/images/placeholder-project.png";
                  }}
                />
              ) : (
                <div className="w-20 h-20 bg-base-200 rounded-lg flex items-center justify-center">
                  <PhotoIcon className="h-8 w-8 text-base-content/40" />
                </div>
              )}
            </div>

            {/* Project Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-base truncate pr-2">
                  {metadata?.title || `Project #${project.tokenId}`}
                </h3>
                {getStatusBadge(project.status)}
              </div>

              {metadata?.description && (
                <p className="text-sm text-base-content/70 line-clamp-2 mb-3">{metadata.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-base-content/60">
                {metadata?.estimatedCost && (
                  <div className="flex items-center gap-1">
                    <CurrencyDollarIcon className="h-4 w-4" />
                    <span>{formatCost(metadata.estimatedCost)}</span>
                  </div>
                )}

                {metadata?.proposalDate && (
                  <div className="flex items-center gap-1">
                    <CalendarDaysIcon className="h-4 w-4" />
                    <span>{new Date(metadata.proposalDate).toLocaleDateString()}</span>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <DocumentTextIcon className="h-4 w-4" />
                  <span>#{project.tokenId}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllProjects;
