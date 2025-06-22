"use client";

import { useState } from "react";
import CouncillorProfile from "./_components/CoucillorProfile";
import LoginPage from "./_components/LoginPage";
import type { NextPage } from "next";
import { useAccount } from "wagmi";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  const [councillorName] = useState("M Sulaiman");
  const [designation] = useState("Ward 32, Palakkad Muncipality");
  const [councillorImage] = useState("/images/temp-councillor-avatar.jpg");

  if (!connectedAddress) {
    return (
      <div>
        <LoginPage />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 flex-1">
      <CouncillorProfile
        councillorName={councillorName}
        councillorImage={councillorImage}
        designation={designation}
        onAddProject={() => {
          console.log("Add project clicked");
        }}
      />
    </div>
  );
};

export default Home;
