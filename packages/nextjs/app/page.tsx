"use client";

import { useState } from "react";
import Image from "next/image";
import type { NextPage } from "next";
import { DocumentPlusIcon } from "@heroicons/react/24/outline";

// import { useAccount } from "wagmi";

const Home: NextPage = () => {
  // const { address: connectedAddress } = useAccount();
  // todo: use wallet address to get the councillor details

  const [councillorName] = useState("M Sulaiman");
  const [designation] = useState("Ward 32, Palakkad Muncipality");
  const [councillorImage] = useState("/images/temp-councillor-avatar.jpg");

  return (
    <>
      <div className="rounded min-h-screen">
        <div className="mt-8 text-center py-10 px-4 space-y-4">
          <div className="avatar">
            <div className="ring-primary ring-offset-base-100 w-24 rounded-full ring-2 ring-offset-2">
              <Image height="100" width="100" src={councillorImage} alt={councillorName} />
            </div>
          </div>
          <div>
            <h3>Welcome,</h3>
            <h1>{councillorName}</h1>
          </div>
          <div className="w-fit py-2 px-4 mx-auto rounded-full border-1 border-neutral-300">
            <span className="text-xs lg:text-base">{designation}</span>
          </div>
          <button className="mt-4 btn btn-primary">
            <DocumentPlusIcon className="h-6" /> Add a Project
          </button>
        </div>
      </div>
    </>
  );
};

export default Home;
