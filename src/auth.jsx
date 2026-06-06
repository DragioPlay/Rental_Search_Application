import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
 
const API = "http://4.237.58.241:3000";
 
// Component to display star ratings
function Stars({ rating }) {
  return (
    <span className="text-yellow-400">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

// Utility function to format ISO date strings into an easier to read format
function formatDate(iso) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
 
// Each row fetches its own rental details
function RatedRow({ entry, index }) {
  const navigate = useNavigate();
  const [rental, setRental] = useState(null);
 
  useEffect(() => {
    fetch(`${API}/rentals/${entry.rentalId}`)
      .then(r => r.ok ? r.json() : null)
      .then(setRental)
      .catch(() => {});
  }, [entry.rentalId]);
 
  // Row content with rental details and rating information
  return (
    <tr
      onClick={() => navigate(`/rental/${entry.rentalId}`)}
      className="hover:bg-purple-50 cursor-pointer transition-colors group border-b border-gray-100 last:border-0"
    >
      <td className="px-4 py-3 text-gray-400 text-sm">{index}</td>
      <td className="px-4 py-3 font-medium text-gray-800 max-w-xs">
        <span className="group-hover:text-purple-600 transition-colors">
          {rental ? rental.title : <span className="text-gray-400 italic text-sm">Loading...</span>}
        </span>
      </td>
      <td className="px-4 py-3 font-bold text-orange-500 whitespace-nowrap">
        {rental ? <>${rental.rent}<span className="text-gray-400 font-normal text-xs">/wk</span></> : "—"}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {rental
          ? <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-semibold capitalize">{rental.propertyType}</span>
          : "—"}
      </td>
      <td className="px-4 py-3 text-gray-600 text-sm">{rental?.postcode ?? "—"}</td>
      <td className="px-4 py-3 text-gray-600 text-sm">{rental?.state ?? "—"}</td>
      <td className="px-4 py-3 text-gray-600 text-sm">{rental?.suburb ?? "—"}</td>
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        <Stars rating={entry.rating} />
        <span className="text-gray-500 ml-1 text-xs">{entry.rating}/5</span>
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(entry.dateTime)}</td>
    </tr>
  );
}
 
// Component to display the user’s rated rentals and allow them to log out
function RatedRentals({ token, onLogout }) {
  const [ratings, setRatings]     = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
 
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API}/ratings?page=${currentPage}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) { onLogout(); return; }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `Error ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled) {
          setRatings(json.data || []);
          setPagination(json.pagination || null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token, currentPage, onLogout]);
 
  // Main content with ratings table
  return (
    <div className="max-w2xl mx-auto py-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <h1 className="text-4xl font-bold text-gray-900">⭐ Rated Rentals</h1>
        <button
          onClick={onLogout}
          className="bg-red-500 hover:bg-red-400 text-white font-bold py-2 px-4 border-b-4 border-red-700 hover:border-red-500 rounded text-sm sm:self-auto transform -translate-x-2"
        >
          Log Out
        </button>
      </div>
 
      <div className="rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-500 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <b className="text-lg font-bold">Your Rated Properties</b>
            <p className="text-blue-100 text-sm mt-0.5">Click any row to view full property details</p>
          </div>
          {pagination && (
            <span className="text-blue-100 text-sm flex-shrink-0">
              {pagination.total} rating{pagination.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
 
        {error && (
          <div className="px-6 py-3 bg-red-50 text-red-600 text-sm font-medium border-b border-red-100">
            ⚠️ {error}
          </div>
        )}
 
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                {["#", "Title", "Rent", "Type", "Postcode", "State", "Suburb", "Your Rating", "Rated On"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
                    Loading your ratings...
                  </td>
                </tr>
              ) : ratings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
                    <div className="text-3xl mb-2">⭐</div>
                    <p>You haven&apos;t rated any properties yet.</p>
                    <Link
                      to="/search"
                      className="inline-block mt-3 bg-orange-500 hover:bg-orange-400 text-white font-bold py-1.5 px-4 border-b-4 border-orange-700 rounded text-sm"
                    >
                      Browse Rentals
                    </Link>
                  </td>
                </tr>
              ) : (
                ratings.map((entry, i) => (
                  <RatedRow
                    key={entry.rentalId}
                    entry={entry}
                    index={(currentPage - 1) * (pagination?.perPage ?? 20) + i + 1}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {pagination && pagination.lastPage > 1 && (
          <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={!pagination.prevPage || loading}
              className="bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-1.5 px-5 border-b-4 border-blue-700 hover:border-blue-500 rounded text-sm"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {pagination.currentPage} of {pagination.lastPage}
            </span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!pagination.nextPage || loading}
              className="bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-1.5 px-5 border-b-4 border-blue-700 hover:border-blue-500 rounded text-sm"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
 
// Component to display the login/register form and handle authentication
function AuthForm({ onLogin }) {
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);
 
  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email || !password) { setError("Both email and password are required."); return; }
 
    setLoading(true);
    const endpoint = mode === "login" ? "/user/login" : "/user/register";
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const contentType = res.headers.get("content-type");
      const data = contentType?.includes("application/json")
        ? await res.json()
        : { message: await res.text() };
 
      if (!res.ok) { setError(data.message || "Something went wrong."); return; }
 
      if (mode === "register") {
        setSuccess("Account created! You can now log in.");
        setMode("login");
        setEmail(""); setPassword("");
        return;
      }
 
      // Login success
      localStorage.setItem("token", data.token);
      localStorage.setItem("tokenType", data.tokenType || "Bearer");
      onLogin(data.token);
    } catch {
      setError("Network error. Check the API or your connection.");
    } finally {
      setLoading(false);
    }
  }
 
  // Main form content with toggle between login and register modes
  return (
    <>
      <h1 className="text-4xl font-bold text-center text-gray-900 mt-6 mb-6">
        🔑 Register / Login
      </h1>
 
      <main className="flex justify-center items-start pb-12 px-4">
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-blue-500 text-white p-5 text-center">
              <b className="text-2xl font-bold">
                {mode === "login" ? "Welcome Back!" : "Create an Account"}
              </b>
              <p className="text-blue-100 mt-1 text-sm">
                {mode === "login"
                  ? "Log in to rate rental properties"
                  : "Register to start rating properties"}
              </p>
            </div>
 
            <div className="bg-white p-8">
              <div className="flex mb-6 rounded-lg overflow-hidden border border-gray-200">
                <button type="button"
                  onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                  className={`flex-1 py-2.5 font-bold text-sm transition-colors ${
                    mode === "login" ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  Login
                </button>
                <button type="button"
                  onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
                  className={`flex-1 py-2.5 font-bold text-sm transition-colors ${
                    mode === "register" ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  Register
                </button>
              </div>
 
              {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">⚠️ {error}</div>}
              {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">✓ {success}</div>}
 
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Email</label>
                  <input type="email" placeholder="you@example.com"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-pink-400"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Password</label>
                  <input type="password" placeholder="Password"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-pink-400"
                    value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              </div>
 
              <button type="submit" disabled={loading}
                className="w-full bg-pink-500 hover:bg-pink-400 text-white font-bold py-3 border-b-4 border-pink-700 hover:border-pink-500 rounded-lg disabled:opacity-50 transition-colors">
                {loading ? "Please wait..." : mode === "login" ? "LOG IN" : "REGISTER"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </>
  );
}
 
// Main component to determine whether to show the login form or the rated rentals based on authentication state
export default function AuthPage() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
 
  function handleLogin(newToken) {
    setToken(newToken);
  }
 
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("tokenType");
    localStorage.removeItem("authHeader");
    setToken(null);
  }
 
  if (token) {
    return <RatedRentals token={token} onLogout={handleLogout} />;
  }
 
  return <AuthForm onLogin={handleLogin} />;
}