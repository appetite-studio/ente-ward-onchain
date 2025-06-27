import { JSX } from "react";
import Image from "next/image";
import { CalendarDaysIcon, CurrencyDollarIcon, PhotoIcon } from "@heroicons/react/24/outline";

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

interface ProjectCardProps {
  project: ProjectData & { metadata: ProjectMetadata | null };
  getStatusBadge: (status: ProjectStatus) => JSX.Element;
  formatCost: (cost: string) => string;
  metadataError?: string;
  onRetryMetadata?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
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
              <div className="mb-1">
                {getStatusBadge(project.status)}
                <h4 className="font-semibold text-base truncate pr-2 mt-1">
                  {metadata?.title || `Project #${project.tokenId}`}
                </h4>
              </div>

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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
