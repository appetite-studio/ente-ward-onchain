"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { pinata } from "~~/utils/config";

interface ProjectProposalMetadata {
  proposalDate: string;
  proposalImage: string;
  title: string;
  description: string;
  estimatedCost: string;
  proposalPDF: string;
}

interface ProjectProposalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (metadataLink: string) => void;
  contractAddress: string;
}

// ABI for the safeMint function
const CONTRACT_ABI = [
  {
    inputs: [
      {
        internalType: "string",
        name: "proposalURI",
        type: "string",
      },
    ],
    name: "safeMint",
    outputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const ProjectProposalForm: React.FC<ProjectProposalFormProps> = ({ isOpen, onClose, onSubmit, contractAddress }) => {
  // Form state
  const [formData, setFormData] = useState<ProjectProposalMetadata>({
    proposalDate: "",
    proposalImage: "",
    title: "",
    description: "",
    estimatedCost: "",
    proposalPDF: "",
  });

  // File upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<{ step: number; total: number }>({ step: 0, total: 6 });

  // Error states
  const [errors, setErrors] = useState<
    Partial<ProjectProposalMetadata & { imageFile: string; pdfFile: string; general: string }>
  >({});

  // Blockchain interaction hooks
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name as keyof ProjectProposalMetadata]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clear previous errors
      setErrors(prev => ({ ...prev, imageFile: "" }));

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors(prev => ({ ...prev, imageFile: "Please select a valid image file (JPEG, PNG, GIF, etc.)" }));
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrors(prev => ({
          ...prev,
          imageFile: `Image file size should be less than 10MB. Current size: ${formatFileSize(file.size)}`,
        }));
        return;
      }

      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = e => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle PDF file selection
  const handlePDFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clear previous errors
      setErrors(prev => ({ ...prev, pdfFile: "" }));

      // Validate file type
      if (file.type !== "application/pdf") {
        setErrors(prev => ({ ...prev, pdfFile: "Please select a valid PDF file" }));
        return;
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrors(prev => ({
          ...prev,
          pdfFile: `PDF file size should be less than 50MB. Current size: ${formatFileSize(file.size)}`,
        }));
        return;
      }

      setPdfFile(file);
    }
  };

  // Upload file to IPFS with retry logic
  const uploadToIPFS = async (file: File, retries = 3): Promise<string> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Validate environment
        if (!process.env.NEXT_PUBLIC_PINATA_GATEWAY) {
          throw new Error("Pinata gateway not configured. Please check environment variables.");
        }

        const urlRequest = await fetch("/api/url", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!urlRequest.ok) {
          throw new Error(`Failed to get upload URL: ${urlRequest.status} ${urlRequest.statusText}`);
        }

        const urlResponse = await urlRequest.json();

        if (!urlResponse.url) {
          throw new Error("Invalid upload URL response from server");
        }

        const upload = await pinata.upload.public.file(file).url(urlResponse.url);

        if (!upload.cid) {
          throw new Error("Failed to get CID from Pinata upload");
        }

        const fileUrl = await pinata.gateways.public.convert(upload.cid);

        if (!fileUrl) {
          throw new Error("Failed to convert CID to gateway URL");
        }

        return fileUrl;
      } catch (error) {
        console.error(`IPFS upload attempt ${attempt} failed:`, error);

        if (attempt === retries) {
          if (error instanceof Error) {
            if (error.message.includes("NetworkError") || error.message.includes("fetch")) {
              throw new Error(`Network error during file upload. Please check your connection and try again.`);
            } else if (error.message.includes("413") || error.message.includes("too large")) {
              throw new Error(`File is too large for upload. Please use a smaller file.`);
            } else {
              throw new Error(`Upload failed: ${error.message}`);
            }
          } else {
            throw new Error("Unknown error occurred during file upload");
          }
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    throw new Error("Upload failed after multiple attempts");
  };

  // Upload metadata to IPFS
  const uploadMetadata = async (metadata: ProjectProposalMetadata): Promise<string> => {
    try {
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
        type: "application/json",
      });
      const metadataFile = new File([metadataBlob], "project-proposal-metadata.json", {
        type: "application/json",
      });

      return await uploadToIPFS(metadataFile);
    } catch (error) {
      console.error("Error uploading metadata:", error);
      throw new Error("Failed to upload metadata to IPFS");
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<ProjectProposalMetadata & { imageFile: string; pdfFile: string }> = {};

    // Text field validations
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters long";
    } else if (formData.title.trim().length > 100) {
      newErrors.title = "Title must be less than 100 characters";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters long";
    } else if (formData.description.trim().length > 1000) {
      newErrors.description = "Description must be less than 1000 characters";
    }

    if (!formData.proposalDate) {
      newErrors.proposalDate = "Proposal date is required";
    }

    if (!formData.estimatedCost.trim()) {
      newErrors.estimatedCost = "Estimated cost is required";
    } else {
      const cost = Number(formData.estimatedCost);
      if (isNaN(cost)) {
        newErrors.estimatedCost = "Estimated cost must be a valid number";
      } else if (cost < 0) {
        newErrors.estimatedCost = "Estimated cost cannot be negative";
      }
    }

    // File validations
    if (!imageFile) {
      newErrors.imageFile = "Project image is required";
    } else {
      if (!imageFile.type.startsWith("image/")) {
        newErrors.imageFile = "Please select a valid image file";
      } else if (imageFile.size > 10 * 1024 * 1024) {
        newErrors.imageFile = `Image file size should be less than 10MB. Current size: ${formatFileSize(imageFile.size)}`;
      }
    }

    if (!pdfFile) {
      newErrors.pdfFile = "Project PDF is required";
    } else {
      if (pdfFile.type !== "application/pdf") {
        newErrors.pdfFile = "Please select a valid PDF file";
      } else if (pdfFile.size > 50 * 1024 * 1024) {
        newErrors.pdfFile = `PDF file size should be less than 50MB. Current size: ${formatFileSize(pdfFile.size)}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission with comprehensive error handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors(prev => ({ ...prev, general: "" }));
    setUploadProgress({ step: 0, total: 6 });

    try {
      // Validate contract address
      if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new Error("Invalid contract address. Please contact your administrator.");
      }

      let imageUrl = "";
      let pdfUrl = "";

      // Step 1: Upload image
      if (imageFile) {
        setUploadStatus("Uploading image to IPFS...");
        setUploadProgress({ step: 1, total: 6 });
        imageUrl = await uploadToIPFS(imageFile);
      }

      // Step 2: Upload PDF
      if (pdfFile) {
        setUploadStatus("Uploading proposal PDF to IPFS...");
        setUploadProgress({ step: 2, total: 6 });
        pdfUrl = await uploadToIPFS(pdfFile);
      }

      // Step 3: Prepare metadata
      setUploadStatus("Preparing project metadata...");
      setUploadProgress({ step: 3, total: 6 });

      const finalMetadata = {
        ...formData,
        proposalImage: imageUrl,
        proposalPDF: pdfUrl,
        timestamp: new Date().toISOString(),
        version: "1.0",
      };

      // Step 4: Upload metadata
      setUploadStatus("Uploading project metadata to IPFS...");
      setUploadProgress({ step: 4, total: 6 });
      const metadataUrl = await uploadMetadata(finalMetadata);

      console.log("Project Proposal Metadata IPFS Link:", metadataUrl);

      // Step 5: Mint NFT
      setUploadStatus("Submitting to blockchain...");
      setUploadProgress({ step: 5, total: 6 });

      await writeContract({
        address: contractAddress as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "safeMint",
        args: [metadataUrl],
      });
    } catch (error) {
      console.error("Submission error:", error);

      let errorMessage = "Failed to submit proposal. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("User rejected") || error.message.includes("rejected")) {
          errorMessage = "Transaction was rejected. Please try again and approve the transaction.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds to complete the transaction. Please check your wallet balance.";
        } else if (error.message.includes("network") || error.message.includes("Network")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message.includes("contract")) {
          errorMessage = "Smart contract error. Please contact your administrator.";
        } else {
          errorMessage = error.message;
        }
      }

      setErrors(prev => ({ ...prev, general: errorMessage }));
      setIsSubmitting(false);
      setUploadStatus("");
      setUploadProgress({ step: 0, total: 6 });
    }
  };

  // Handle successful transaction
  useEffect(() => {
    if (isConfirmed) {
      setUploadStatus("Project successfully created!");
      setUploadProgress({ step: 6, total: 6 });

      // Call the onSubmit callback
      onSubmit("Project created successfully!");

      // Reset form after success
      setTimeout(() => {
        resetForm();
        onClose();
        setIsSubmitting(false);
        setUploadStatus("");
        setUploadProgress({ step: 0, total: 6 });
      }, 2000);
    }
  }, [isConfirmed, onSubmit, onClose]);

  // Handle transaction error
  useEffect(() => {
    if (writeError) {
      console.error("Transaction error:", writeError);

      let errorMessage = "Failed to create project on blockchain.";

      if (writeError.message.includes("User rejected") || writeError.message.includes("rejected")) {
        errorMessage = "Transaction was rejected. Please try again and approve the transaction.";
      } else if (writeError.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds to complete the transaction.";
      } else if (writeError.message.includes("network")) {
        errorMessage = "Network error. Please check your connection and try again.";
      }

      setErrors(prev => ({ ...prev, general: errorMessage }));
      setIsSubmitting(false);
      setUploadStatus("");
      setUploadProgress({ step: 0, total: 6 });
    }
  }, [writeError]);

  // Reset form function
  const resetForm = () => {
    setFormData({
      proposalDate: "",
      proposalImage: "",
      title: "",
      description: "",
      estimatedCost: "",
      proposalPDF: "",
    });
    setImageFile(null);
    setPdfFile(null);
    setImagePreview("");
    setErrors({});
    setUploadProgress({ step: 0, total: 6 });
  };

  // Reset form when modal closes
  const handleClose = () => {
    if (isProcessing) {
      const confirmClose = window.confirm("Are you sure you want to close? Your progress will be lost.");
      if (!confirmClose) return;
    }

    resetForm();
    setUploadStatus("");
    onClose();
  };

  if (!isOpen) return null;

  const isProcessing = isSubmitting || isPending || isConfirming;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Create Project Proposal</h3>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="btn btn-sm btn-circle btn-ghost disabled:opacity-50"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Project Title *</legend>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              disabled={isProcessing}
              className={`input input-bordered w-full ${errors.title ? "input-error" : ""}`}
              placeholder="Enter project title"
              maxLength={100}
            />
            <div className="label">
              <span className={`label-text-alt ${errors.title ? "text-error" : "text-base-content/60"}`}>
                {errors.title || `${formData.title.length}/100 characters`}
              </span>
            </div>
          </fieldset>

          {/* Description */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Project Description *</legend>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              disabled={isProcessing}
              rows={4}
              className={`textarea textarea-bordered w-full ${errors.description ? "textarea-error" : ""}`}
              placeholder="Describe your project proposal in detail"
              maxLength={1000}
            />
            <div className="label">
              <span className={`label-text-alt ${errors.description ? "text-error" : "text-base-content/60"}`}>
                {errors.description || `${formData.description.length}/1000 characters`}
              </span>
            </div>
          </fieldset>

          {/* Proposal Date */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
              Proposal Date *
            </legend>
            <input
              type="date"
              name="proposalDate"
              value={formData.proposalDate}
              onChange={handleInputChange}
              disabled={isProcessing}
              className={`input input-bordered w-full ${errors.proposalDate ? "input-error" : ""}`}
            />
            <div className="label">
              <span className={`label-text-alt ${errors.proposalDate ? "text-error" : "text-base-content/60"}`}>
                {errors.proposalDate || "Select the date for this proposal"}
              </span>
            </div>
          </fieldset>

          {/* Estimated Cost */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
              Estimated Cost (INR) *
            </legend>
            <input
              type="number"
              name="estimatedCost"
              value={formData.estimatedCost}
              onChange={handleInputChange}
              disabled={isProcessing}
              className={`input input-bordered w-full ${errors.estimatedCost ? "input-error" : ""}`}
              placeholder="Enter estimated cost"
              min="0"
              step="0.01"
            />
            <div className="label">
              <span className={`label-text-alt ${errors.estimatedCost ? "text-error" : "text-base-content/60"}`}>
                {errors.estimatedCost || "Enter amount in Indian Rupees"}
              </span>
            </div>
          </fieldset>

          {/* Image Upload */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              <PhotoIcon className="h-4 w-4 inline mr-1" />
              Project Image *
            </legend>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={isProcessing}
              className={`file-input file-input-bordered w-full ${errors.imageFile ? "file-input-error" : ""}`}
            />
            <div className="label">
              <span className={`label-text-alt ${errors.imageFile ? "text-error" : "text-base-content/60"}`}>
                {errors.imageFile || "Max size 10MB (JPEG, PNG, GIF, etc.)"}
              </span>
            </div>

            {imagePreview && (
              <div className="mt-3">
                <Image
                  height="256"
                  width="256"
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded border-neutral-300 border-2"
                />
              </div>
            )}
          </fieldset>

          {/* PDF Upload */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              <DocumentTextIcon className="h-4 w-4 inline mr-1" />
              Project Proposal PDF *
            </legend>
            <input
              type="file"
              accept=".pdf"
              onChange={handlePDFChange}
              disabled={isProcessing}
              className={`file-input file-input-bordered w-full ${errors.pdfFile ? "file-input-error" : ""}`}
            />
            <div className="label">
              <span className={`label-text-alt ${errors.pdfFile ? "text-error" : "text-base-content/60"}`}>
                {errors.pdfFile || "Max size 50MB"}
              </span>
            </div>

            {pdfFile && !errors.pdfFile && (
              <p className="text-xs text-gray-600 mb-2 flex items-center">
                PDF selected: {pdfFile.name} ({formatFileSize(pdfFile.size)})
              </p>
            )}
          </fieldset>

          {/* General Error Display */}
          {errors.general && (
            <div className="alert alert-error">
              <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div>
                <h3 className="font-bold">Error</h3>
                <div className="text-xs">{errors.general}</div>
              </div>
            </div>
          )}

          {/* Upload Status with Progress */}
          {uploadStatus && (
            <div className="alert alert-info">
              <span className="loading loading-spinner loading-sm"></span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span>{uploadStatus}</span>
                  <span className="text-xs">
                    {uploadProgress.step}/{uploadProgress.total}
                  </span>
                </div>
                <progress
                  className="progress progress-info w-full"
                  value={uploadProgress.step}
                  max={uploadProgress.total}
                ></progress>
              </div>
            </div>
          )}

          {/* Blockchain Status */}
          {hash && (
            <div className="alert alert-info">
              <span className="loading loading-spinner loading-sm"></span>
              <span>Transaction Hash: {hash}</span>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="modal-action">
            <button type="button" onClick={handleClose} disabled={isProcessing} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={isProcessing} className="btn btn-primary">
              {isProcessing ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {isPending ? "Confirming..." : isConfirming ? "Minting..." : "Processing..."}
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  Submit Proposal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectProposalForm;
