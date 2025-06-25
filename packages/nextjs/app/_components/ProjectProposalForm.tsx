"use client";

import { useState } from "react";
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
}

const ProjectProposalForm: React.FC<ProjectProposalFormProps> = ({ isOpen, onClose, onSubmit }) => {
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

  // Error states
  const [errors, setErrors] = useState<Partial<ProjectProposalMetadata & { imageFile: string; pdfFile: string }>>({});

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

  // Upload file to IPFS
  const uploadToIPFS = async (file: File): Promise<string> => {
    try {
      const urlRequest = await fetch("/api/url");
      const urlResponse = await urlRequest.json();
      const upload = await pinata.upload.public.file(file).url(urlResponse.url);
      const fileUrl = await pinata.gateways.public.convert(upload.cid);
      return fileUrl;
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      throw new Error("Failed to upload file to IPFS");
    }
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

  // Handle form submission with automated uploads
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      let imageUrl = "";
      let pdfUrl = "";

      // Upload image if present
      if (imageFile) {
        setUploadStatus("Uploading image...");
        imageUrl = await uploadToIPFS(imageFile);
      }

      // Upload PDF if present
      if (pdfFile) {
        setUploadStatus("Uploading proposal PDF...");
        pdfUrl = await uploadToIPFS(pdfFile);
      }

      // Prepare final metadata
      const finalMetadata = {
        ...formData,
        proposalImage: imageUrl,
        proposalPDF: pdfUrl,
      };

      // Upload metadata to IPFS
      setUploadStatus("Uploading project metadata...");
      const metadataUrl = await uploadMetadata(finalMetadata);

      console.log("Project Proposal Metadata IPFS Link:", metadataUrl);

      setUploadStatus("Finalizing submission...");

      // Call the onSubmit callback
      onSubmit(metadataUrl);

      // Reset form
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

      // Close modal
      onClose();
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit proposal. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadStatus("");
    }
  };

  // Reset form when modal closes
  const handleClose = () => {
    if (isSubmitting) return;

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
    setUploadStatus("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Create Project Proposal</h3>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
              className={`file-input file-input-bordered w-full ${errors.imageFile ? "file-input-error" : ""}`}
            />
            <div className="label">
              <span className={`label-text-alt ${errors.imageFile ? "text-error" : "text-base-content/60"}`}>
                {errors.imageFile || "Max size 10MB (JPEG, PNG, GIF, etc.)"}
              </span>
            </div>

            {imagePreview && (
              <div className="mt-3">
                <img
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
              disabled={isSubmitting}
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

          {/* Upload Status */}
          {uploadStatus && (
            <div className="alert alert-info">
              <span className="loading loading-spinner loading-sm"></span>
              <span>{uploadStatus}</span>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="modal-action">
            <button type="button" onClick={handleClose} disabled={isSubmitting} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Processing...
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
