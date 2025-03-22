import React from "react";
import logo1 from "../assets/logo1.png"

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 md:px-8 py-8 sm:py-12 bg-gray-50">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-violet-500 mb-3 sm:mb-4 text-center">
        Welcome to PulsePal
      </h1>
      <p className="text-base sm:text-lg text-gray-600 text-center max-w-sm sm:max-w-xl md:max-w-2xl">
        Monitor and manage a patients blood pressure easily.
      </p>
      <img src={logo1} alt="logo2" className="rounded-sm h-92 w-92 mt-12"></img>
    </div>
  );
};

export default Home;
