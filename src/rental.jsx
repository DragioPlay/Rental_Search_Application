import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Map, Marker } from "pigeon-maps";

const API = "http://4.237.58.241:3000";

// ─── Property Map using Pigeon Maps ──────────────────────────────────────────
function PropertyMap({ rental }) {
  const hasCoords = Boolean(rental.latitude && rental.longitude);

  const [coords, setCoords] = useState(
    hasCoords ? [rental.latitude, rental.longitude] : null
  );

  const rentalId = rental.id;
  const suburb   = rental.suburb;
  const locality = rental.locality;
  const postcode = rental.postcode;
  const state    = rental.state;

  useEffect(() => {
    if (hasCoords) return;
    const q = encodeURIComponent(
      `${suburb || locality || postcode || ""} ${state || ""} Australia`
    );
    fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`)
      .then(r => r.json())
      .then(d => {
        if (d?.[0]) setCoords([parseFloat(d[0].lat), parseFloat(d[0].lon)]);
      })
      .catch(() => {});
  }, [rentalId, hasCoords, suburb, locality, postcode, state]);

  if (!coords) {
    return (
      <div className="h-72 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm gap-2">
        <span className="text-2xl">📍</span>
        <span>{suburb} {postcode} {state}</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ height: 288 }}>
      <Map
        center={coords}
        zoom={15}
        height={288}
        attribution={
          <span className="text-[10px] text-gray-500">
            © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a> contributors
          </span>
        }
      >
        <Marker
          anchor={coords}
          color="#e85d26"
          width={42}
        />
      </Map>
    </div>
  );
}

// ─── Star rating input ────────────────────────────────────────────────────────
function StarInput({ rentalId, token, existingRating }) {
  const [hover, setHover]       = useState(0);
  const [selected, setSelected] = useState(existingRating || 0);
  const [status, setStatus]     = useState(null);

  const submit = useCallback(async (stars) => {
    setSelected(stars);
    setStatus("loading");
    try {
      const res = await fetch(`${API}/ratings/rentals/${rentalId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rating: stars }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Error ${res.status}`);
      }
      setStatus("ok");
    } catch (e) {
      setStatus(e.message || "error");
    }
  }, [rentalId, token]);

  if (!token) {
    return (
      <p className="text-sm text-gray-500 italic">
        <Link to="/auth" className="text-blue-500 font-semibold hover:underline">Log in</Link>{" "}
        to rate this property.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">
        {existingRating
          ? `Your previous rating: ${"★".repeat(existingRating)}${"☆".repeat(5 - existingRating)}`
          : "Rate this property:"}
      </p>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            className={`text-3xl transition-all leading-none hover:scale-110 ${
              n <= (hover || selected) ? "text-yellow-400" : "text-gray-200"
            }`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => submit(n)}
          >
            ★
          </button>
        ))}
      </div>
      {status === "loading" && (
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          Submitting...
        </p>
      )}
      {status === "ok" && (
        <p className="text-xs text-green-600 mt-2 font-semibold">✓ Rating saved!</p>
      )}
      {status && status !== "loading" && status !== "ok" && (
        <p className="text-xs text-red-500 mt-2">⚠ {status}</p>
      )}
    </div>
  );
}

// ─── Detail row helper ────────────────────────────────────────────────────────
function DetailRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-400 w-28 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-700 flex-1 font-medium">{value}</span>
    </div>
  );
}

// ─── Stat badge ───────────────────────────────────────────────────────────────
function StatBadge({ icon, label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="bg-white/10 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
      <div className="text-2xl mb-0.5">{icon}</div>
      <div className="text-white font-bold text-lg leading-tight">{value}</div>
      <div className="text-blue-100 text-xs mt-0.5">{label}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RentalDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [rental, setRental]                 = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [existingRating, setExistingRating] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setRental(null);

      try {
        const res = await fetch(`${API}/rentals/${id}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!cancelled) setRental(data);
      } catch (e) {
        if (!cancelled)
          setError(e.message === "404" ? "Rental not found." : "Could not load rental.");
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (token) {
        try {
          const res = await fetch(`${API}/ratings/rentals/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (!cancelled && data?.rating) setExistingRating(data.rating);
          }
        } catch { /* 404 = no rating yet */ }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, token]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <p className="text-sm">Loading rental...</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🏚️</div>
        <p className="text-gray-600 mb-6 text-lg">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-6 border-b-4 border-blue-700 hover:border-blue-500 rounded-lg text-sm"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  if (!rental) return null;

  const fullStars = Math.round(rental.averageRating || 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 px-4 border-b-4 border-gray-300 hover:border-gray-400 rounded-lg text-sm transition-colors"
      >
        ← Go Back
      </button>

      {/* ── Hero header card ────────────────────────────────────────────── */}
      <div className="rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-500 text-white p-6">
          {/* Title + price */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-semibold capitalize">
                  {rental.propertyType}
                </span>
                <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">
                  {rental.suburb}, {rental.state}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">{rental.title}</h1>
              {rental.streetAddress && (
                <p className="text-blue-100 mt-1.5 text-sm flex items-center gap-1">
                  <span>📍</span> {rental.streetAddress}, {rental.suburb} {rental.postcode}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-4xl font-bold text-orange-300">
                ${rental.rent}
                <span className="text-base font-normal text-blue-200">/wk</span>
              </div>
              {rental.averageRating > 0 && (
                <div className="mt-1">
                  <span className="text-yellow-300 text-lg">
                    {"★".repeat(fullStars)}{"☆".repeat(5 - fullStars)}
                  </span>
                  <span className="text-blue-200 text-sm ml-1">
                    {parseFloat(rental.averageRating).toFixed(1)} · {rental.numRatings} review{rental.numRatings !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stat badges */}
          <div className="grid grid-cols-3 gap-3">
            <StatBadge icon="🛏️" label={rental.bedrooms === 1 ? "Bedroom" : "Bedrooms"} value={rental.bedrooms} />
            <StatBadge icon="🚿" label={rental.bathrooms === 1 ? "Bathroom" : "Bathrooms"} value={rental.bathrooms} />
            <StatBadge icon="🚗" label={rental.parkingSpaces === 1 ? "Parking Space" : "Parking Spaces"} value={rental.parkingSpaces} />
          </div>
        </div>
      </div>

      {/* ── Two-column body ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Left col: map + description */}
        <div className="md:col-span-2 space-y-5">

          {/* Map card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-3">
              <h2 className="text-xs font-bold uppercase tracking-widest !text-black">📍 Location</h2>
            </div>
            <div className="p-4">
              <PropertyMap rental={rental} />
            </div>
          </div>

          {/* Description card */}
          {rental.description && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-5 py-3">
                <h2 className="text-xs font-bold uppercase tracking-widest !text-black">📄 Description</h2>
              </div>
              <div className="p-5">
                <div
                  className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: rental.description }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right col: details + rating */}
        <div className="space-y-5">

          {/* Property details */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-3">
              <h2 className="text-xs font-bold uppercase tracking-widest !text-black">🏠 Property Details</h2>
            </div>
            <div className="px-5 py-2">
              <DetailRow label="Weekly Rent" value={`$${rental.rent}`} />
              <DetailRow label="Type"        value={rental.propertyType} />
              <DetailRow label="Address"     value={rental.streetAddress} />
              <DetailRow label="Suburb"      value={rental.suburb} />
              <DetailRow label="Locality"    value={rental.locality !== rental.suburb ? rental.locality : null} />
              <DetailRow label="Postcode"    value={rental.postcode} />
              <DetailRow label="State"       value={rental.state} />
              <DetailRow label="Bedrooms"    value={rental.bedrooms} />
              <DetailRow label="Bathrooms"   value={rental.bathrooms} />
              <DetailRow label="Parking"     value={rental.parkingSpaces} />
              <DetailRow label="Agency"      value={rental.agencyName} />
              <DetailRow label="Amenities"   value={rental.amenities} />
            </div>
          </div>

          {/* Rating card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-3">
              <h2 className="text-xs font-bold uppercase tracking-widest !text-black">⭐ Rating</h2>
            </div>
            <div className="p-5">
              {rental.numRatings > 0 ? (
                <div className="flex items-center gap-4 mb-5 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                  <span className="text-4xl font-bold text-gray-800">
                    {parseFloat(rental.averageRating).toFixed(1)}
                  </span>
                  <div>
                    <div className="text-yellow-400 text-xl leading-none">
                      {"★".repeat(fullStars)}{"☆".repeat(5 - fullStars)}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {rental.numRatings} review{rental.numRatings !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-gray-50 rounded-xl text-center">
                  <p className="text-gray-400 text-sm italic">No ratings yet — be the first!</p>
                </div>
              )}
              <StarInput
                rentalId={rental.id || id}
                token={token}
                existingRating={existingRating}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}