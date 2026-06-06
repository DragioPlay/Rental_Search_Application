import { Link, Routes, Route } from "react-router-dom";

import RentalDetail from "./rental";
import Search from "./search";
import Login from "./auth";

// Home component with information about the app
function Home() {
  return (
      <section className="w-full max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-center text-gray-900 mb-10">
          🏠 Home
        </h1>

        <div className=" rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-blue-500 text-white p-10 text-center">
            <b className="text-3xl font-bold">About Us</b>
            <p className="mt-3 text-blue-100">
              Helping users find rental properties across Australia
            </p>
          </div>

          <div className="bg-white p-8 flex flex-col md:flex-row items-center gap-8">
            <img
              src="/Australia.png"
              alt="Australia Image"
              className="w-48 h-48 object-contain"
            />

            <div className="space-y-4 text-lg">
              <i>
                Come in and find your new home here in Australia!
              </i>
              <p>
                search for rental properties and filter to find your dream home
              </p>
              <p>
                Sign-in to rate rental properties and view rated properties
              </p>
              <p className="font-semibold">
                Made by Aryan Vijay Anand
              </p>
            </div>
          </div>
        </div>
      </section>
  );
}


// Main App component with navigation and routing
export default function App() {
  return (
    <>
      <div className="bg-blue-500 text-white p-7 rounded-none shadow-xl text-center flex flex-col md:flex-row items-center justify-between mb-1">

        <p className="text-2xl font-bold flex justify-start -mt-2">
        🇦🇺 Rentals
        </p>

        <Link to="/" className="bg-green-500 hover:bg-green-400 text-white font-bold py-2 px-4 border-b-4 border-green-700 hover:border-green-500 rounded">
          HOME
        </Link>

        <Link to="/search" className="bg-orange-500 hover:bg-orange-400 text-white font-bold py-2 px-4 border-b-4 border-orange-700 hover:border-orange-500 rounded">
          SEARCH
        </Link>

        <Link to="/auth" className="bg-pink-500 hover:bg-pink-700 text-white font-bold py-2 px-4 border-b-4 border-pink-700 hover:border-pink-500 rounded">
          ACCOUNT
        </Link>

      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/auth" element={<Login />} />
        <Route path="/rental/:id" element={<RentalDetail />} />
      </Routes>
    </>
  );
}