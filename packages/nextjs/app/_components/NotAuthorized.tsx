import { XMarkIcon } from "@heroicons/react/20/solid";

export default function NotAuthorized() {
  return (
    <div className="mt-8 text-center py-10 px-4 space-y-6">
      <div className="avatar">
        <div className="ring-neutral-400 bg-neutral-400 text-white ring-offset-base-100 w-24 rounded-full ring-2 ring-offset-2">
          <XMarkIcon />
        </div>
      </div>
      <div>
        <h1>Not Authorized</h1>
      </div>
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
