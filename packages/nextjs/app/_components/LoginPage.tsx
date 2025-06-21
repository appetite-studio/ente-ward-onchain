import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

export default function LoginPage() {
  return (
    <div className="mt-8 text-center py-10 px-4 space-y-6">
      <h1>Log in with Wallet</h1>
      <p className="opacity-70 max-w-xl mx-auto mb-6">
        Ente Ward Projects live on the Polygon blockchain. Login with your authorized wallet to manage the projects on
        your ward.
      </p>

      <RainbowKitCustomConnectButton />
      <div>
        <p>
          Need help? contact{" "}
          <a className="link link-hover font-bold " href="tel:+91 88919 66511">
            +91 88919 66511
          </a>
        </p>
      </div>
    </div>
  );
}
