import React from "react";

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white text-center p-3 sm:p-4 md:p-6 mt-4 sm:mt-6 md:mt-8">
      <p className="text-sm sm:text-base md:text-lg max-w-3xl mx-auto px-2">
        &copy; {new Date().getFullYear()} PulsePal. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
