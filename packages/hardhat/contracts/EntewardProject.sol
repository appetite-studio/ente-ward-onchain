// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity >=0.8.0 <0.9.0;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EntewardProject
 * @dev ERC721 token contract for managing community projects with immutable blockchain records
 * @notice This contract allows local representatives to create, track, and update community projects
 * Each project is represented as an NFT with proposal and report URIs stored immutably on-chain
 */
contract EntewardProject is ERC721, Ownable {
    /// @dev Contract version for tracking deployments
    string public constant VERSION = "0.1.0";

    /// @dev Counter for generating unique token IDs, starts at 0
    uint256 private _nextTokenId;

    /**
     * @dev Enum representing the lifecycle status of a project
     * @notice Status transitions are restricted to prevent invalid state changes
     */
    enum ProjectStatus {
        Upcoming, // 0: Project proposed but not started yet
        Ongoing, // 1: Project is currently in progress
        Cancelled, // 2: Project has been cancelled (terminal state)
        Completed // 3: Project has been finished with report (terminal state)
    }

    /**
     * @dev Struct containing all project-related data
     * @param status Current status of the project
     * @param proposalURI IPFS hash or URL containing project proposal details
     * @param reportURI IPFS hash or URL containing completion report (only for completed projects)
     */
    struct Project {
        ProjectStatus status;
        string proposalURI;
        string reportURI;
    }

    /// @dev Mapping from token ID to project data
    mapping(uint256 => Project) public projects;

    /**
     * @dev Emitted when a new project is created
     * @param tokenId The unique identifier of the project
     * @param proposalURI The URI containing project proposal details
     */
    event ProjectCreated(uint256 indexed tokenId, string proposalURI);

    /**
     * @dev Emitted when a project's status is updated
     * @param tokenId The unique identifier of the project
     * @param newStatus The new status of the project
     */
    event ProjectStatusUpdated(uint256 indexed tokenId, ProjectStatus newStatus);

    /**
     * @dev Emitted when a completion report is added to a project
     * @param tokenId The unique identifier of the project
     * @param reportURI The URI containing project completion report
     */
    event ProjectReportAdded(uint256 indexed tokenId, string reportURI);

    /**
     * @dev Custom errors for gas optimization and better error handling
     */
    error ProjectNotFound(uint256 tokenId);
    error InvalidStatusTransition(ProjectStatus current, ProjectStatus requested);
    error ReportURIRequired();
    error NoProjectsExist();
    error PageOutOfBounds(uint256 page, uint256 maxPages);
    error EmptyProposalURI();
    error TransfersNotAllowed();

    /**
     * @dev Constructor initializes the ERC721 token and sets the initial owner
     * @param initialOwner Address that will own the contract and can mint/update projects
     */
    constructor(address initialOwner) ERC721("EntewardProject", "EP") Ownable(initialOwner) {}

    /**
     * @dev Creates a new project NFT with the specified proposal
     * @param proposalURI URI containing the project proposal details (cannot be empty)
     * @return tokenId The unique identifier of the newly created project
     * @notice Only the contract owner can create new projects
     * @notice Projects are minted to the contract owner and cannot be transferred
     * @notice Projects start with "Upcoming" status by default
     */
    function safeMint(string calldata proposalURI) external onlyOwner returns (uint256 tokenId) {
        if (bytes(proposalURI).length == 0) revert EmptyProposalURI();

        tokenId = _nextTokenId++;
        _safeMint(owner(), tokenId);

        projects[tokenId] = Project({ status: ProjectStatus.Upcoming, proposalURI: proposalURI, reportURI: "" });

        emit ProjectCreated(tokenId, proposalURI);
    }

    /**
     * @dev Updates the status of an existing project with optional completion report
     * @param tokenId The unique identifier of the project to update
     * @param newStatus The new status to assign to the project
     * @param reportURI URI containing completion report (required for completed projects)
     * @notice Only the contract owner can update project status
     * @notice Status transitions follow strict rules to maintain data integrity
     * @notice Completed projects must include a report URI
     */
    function updateStatus(uint256 tokenId, ProjectStatus newStatus, string calldata reportURI) external onlyOwner {
        if (_ownerOf(tokenId) == address(0)) revert ProjectNotFound(tokenId);

        Project storage project = projects[tokenId];

        if (!_isValidStatusTransition(project.status, newStatus)) {
            revert InvalidStatusTransition(project.status, newStatus);
        }

        if (newStatus == ProjectStatus.Completed && bytes(reportURI).length == 0) {
            revert ReportURIRequired();
        }

        project.status = newStatus;
        emit ProjectStatusUpdated(tokenId, newStatus);

        if (newStatus == ProjectStatus.Completed) {
            project.reportURI = reportURI;
            emit ProjectReportAdded(tokenId, reportURI);
        }
    }

    /**
     * @dev Retrieves a paginated list of projects in descending order (newest first)
     * @param projectsPerPage Number of projects to return per page
     * @param page Page number (0-indexed, page 0 contains newest projects)
     * @return tokenIds Array of project token IDs
     * @return statuses Array of project statuses
     * @return proposalURIs Array of project proposal URIs
     * @return reportURIs Array of project report URIs
     * @notice Gas-optimized for batch retrieval of project data
     * @notice Returns empty arrays if no projects exist on the requested page
     */
    function getProjects(
        uint256 projectsPerPage,
        uint256 page
    )
        external
        view
        returns (
            uint256[] memory tokenIds,
            ProjectStatus[] memory statuses,
            string[] memory proposalURIs,
            string[] memory reportURIs
        )
    {
        uint256 totalProjects = _nextTokenId;
        if (totalProjects == 0) revert NoProjectsExist();

        uint256 startIndex = page * projectsPerPage;
        if (startIndex >= totalProjects) {
            revert PageOutOfBounds(page, (totalProjects - 1) / projectsPerPage);
        }

        uint256 endIndex = startIndex + projectsPerPage;
        if (endIndex > totalProjects) {
            endIndex = totalProjects;
        }

        uint256 resultLength = endIndex - startIndex;

        tokenIds = new uint256[](resultLength);
        statuses = new ProjectStatus[](resultLength);
        proposalURIs = new string[](resultLength);
        reportURIs = new string[](resultLength);

        // Fill arrays in descending order (latest projects first)
        unchecked {
            for (uint256 i = 0; i < resultLength; ++i) {
                uint256 tokenId = totalProjects - 1 - startIndex - i;
                Project storage project = projects[tokenId];

                tokenIds[i] = tokenId;
                statuses[i] = project.status;
                proposalURIs[i] = project.proposalURI;
                reportURIs[i] = project.reportURI;
            }
        }
    }

    /**
     * @dev Retrieves detailed information for a specific project
     * @param tokenId The unique identifier of the project
     * @return status Current status of the project
     * @return proposalURI URI containing project proposal details
     * @return reportURI URI containing project completion report (empty if not completed)
     * @notice Reverts if the project does not exist
     */
    function getProject(
        uint256 tokenId
    ) external view returns (ProjectStatus status, string memory proposalURI, string memory reportURI) {
        if (_ownerOf(tokenId) == address(0)) revert ProjectNotFound(tokenId);

        Project storage project = projects[tokenId];
        return (project.status, project.proposalURI, project.reportURI);
    }

    /**
     * @dev Returns the total number of projects created
     * @return Total count of projects (equivalent to _nextTokenId)
     * @notice Useful for pagination calculations and UI display
     */
    function getTotalProjects() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @dev Internal function to validate status transitions
     * @param currentStatus The current status of the project
     * @param newStatus The requested new status
     * @return bool True if the transition is valid, false otherwise
     * @notice Implements business logic for valid project lifecycle transitions
     */
    function _isValidStatusTransition(
        ProjectStatus currentStatus,
        ProjectStatus newStatus
    ) private pure returns (bool) {
        // Terminal states cannot be changed
        if (currentStatus == ProjectStatus.Cancelled || currentStatus == ProjectStatus.Completed) {
            return false;
        }

        // Upcoming projects can only go to Ongoing or Cancelled
        if (currentStatus == ProjectStatus.Upcoming) {
            return newStatus == ProjectStatus.Ongoing || newStatus == ProjectStatus.Cancelled;
        }

        // Ongoing projects can only go to Completed or Cancelled
        if (currentStatus == ProjectStatus.Ongoing) {
            return newStatus == ProjectStatus.Completed || newStatus == ProjectStatus.Cancelled;
        }

        return false;
    }

    /**
     * @dev Override transfer functions to prevent NFT transfers
     * @notice Project NFTs are immutable records and cannot be transferred
     * @notice This ensures project ownership remains with the contract owner
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0)) but prevent all transfers
        if (from != address(0) && to != address(0)) {
            revert TransfersNotAllowed();
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override approve to prevent approvals since transfers are disabled
     * @notice Approvals are not allowed as transfers are disabled
     */
    function approve(address, uint256) public pure override {
        revert TransfersNotAllowed();
    }

    /**
     * @dev Override setApprovalForAll to prevent approvals since transfers are disabled
     * @notice Approvals are not allowed as transfers are disabled
     */
    function setApprovalForAll(address, bool) public pure override {
        revert TransfersNotAllowed();
    }
}
