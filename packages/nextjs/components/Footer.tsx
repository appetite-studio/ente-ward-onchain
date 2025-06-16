import React from "react";

/**
 * Site footer
 */
export const Footer = () => {
  return (
    <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0">
      <div className="fixed z-10 p-4 bottom-0 right-0 pointer-events-none">
        <a className="btn btn-sm btn-neutral shadow-lg" href="tel:+91 88919 66511">
          Call support<span className="hidden lg:inline">: +91 8891 966 511</span>
        </a>
      </div>
      <div className="w-full">
        <ul className="menu menu-horizontal w-full">
          <div className="flex justify-center items-center gap-2 text-sm w-full">
            <div className="text-center">Ente Ward Admin (on chain)</div>
            <span>·</span>
            <div className="flex justify-center items-center gap-2">
              <p className="m-0 text-center">Built for</p>
              <a href="https://enteward.app" target="_blank" rel="noreferrer">
                <span className="link">Ente Ward</span>
              </a>
            </div>
          </div>
        </ul>
      </div>
    </div>
  );
};
