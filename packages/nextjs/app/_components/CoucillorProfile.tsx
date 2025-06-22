import Image from "next/image";
import { DocumentPlusIcon } from "@heroicons/react/24/outline";

interface CouncillorProfileProps {
  councillorName: string;
  councillorImage: string;
  designation: string;
  onAddProject?: () => void;
}

export default function CouncillorProfile({
  councillorName,
  councillorImage,
  designation,
  onAddProject,
}: CouncillorProfileProps) {
  return (
    <div className="text-center py-10 px-4 border-b-2 lg:border-b-0 lg:border-r-2 border-neutral-100 flex items-center justify-center">
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
        <button className="mt-4 btn btn-primary" onClick={onAddProject}>
          <DocumentPlusIcon className="h-6" /> Add a Project
        </button>
      </div>
    </div>
  );
}
