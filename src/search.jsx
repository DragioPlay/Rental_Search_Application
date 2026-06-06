import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  InfiniteRowModelModule,
  ClientSideRowModelModule,
  ValidationModule,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

ModuleRegistry.registerModules([
  InfiniteRowModelModule,
  ClientSideRowModelModule,
  ValidationModule,
]);

const API = "http://4.237.58.241:3000";

const SORT_FIELDS = [
  { value: "", label: "Default (id)" },
  { value: "rent", label: "Rent" },
  { value: "title", label: "Title" },
  { value: "propertyType", label: "Property Type" },
  { value: "suburb", label: "Suburb" },
  { value: "postcode", label: "Postcode" },
  { value: "state", label: "State" },
  { value: "bathrooms", label: "Bathrooms" },
  { value: "bedrooms", label: "Bedrooms" },
  { value: "parkingSpaces", label: "Parking" },
  { value: "averageRating", label: "Rating" },
  { value: "numRatings", label: "# Ratings" },
];

// ─── Custom cell renderers ────────────────────────────────────────────────────
function RentCell({ value }) {
  if (!value) return null;
  return (
    <span className="font-bold text-orange-500">
      ${value}<span className="text-gray-400 font-normal text-xs">/wk</span>
    </span>
  );
}

function TypeCell({ value }) {
  if (!value) return null;
  return (
    <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-semibold capitalize">
      {value}
    </span>
  );
}

function RatingCell({ data }) {
  if (!data) return null;
  const { averageRating, numRatings } = data;
  if (!averageRating || numRatings === 0)
    return <span className="text-gray-400 text-xs">-- (0)</span>;
  const full = Math.round(averageRating);
  return (
    <span className="text-xs whitespace-nowrap">
      <span className="text-yellow-400">{"★".repeat(full)}{"☆".repeat(5 - full)}</span>
      <span className="text-gray-500 ml-1">({numRatings})</span>
    </span>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const gridRef = useRef(null);

  // dropdown data
  const [states, setStates] = useState([]);
  const [propTypes, setPropTypes] = useState([]);

  // basic filters
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);

  // advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [maxBeds, setMaxBeds] = useState("");
  const [minBaths, setMinBaths] = useState("");
  const [maxBaths, setMaxBaths] = useState("");
  const [minParking, setMinParking] = useState("");
  const [maxParking, setMaxParking] = useState("");
  const [minRating, setMinRating] = useState("");
  const [maxRating, setMaxRating] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  // committed search params — only change on Search click
  const [committed, setCommitted] = useState({});
  const [totalResults, setTotalResults] = useState(null);

  useEffect(() => {
    fetch(`${API}/rentals/states`).then(r => r.json()).then(setStates).catch(() => {});
    fetch(`${API}/rentals/property-types`).then(r => r.json()).then(setPropTypes).catch(() => {});
  }, []);

  // AG Grid datasource — re-created whenever committed params change
  const datasource = useMemo(() => ({
    getRows: async (params) => {
      const pageSize = 10;
      const page = Math.floor(params.startRow / pageSize) + 1;
      const p = new URLSearchParams();
      p.set("page", page);
      if (committed.suburb)        p.set("suburb", committed.suburb);
      if (committed.state)         p.set("state", committed.state);
      if (committed.postcode)      p.set("postcode", committed.postcode);
      if (committed.minRent)       p.set("minimumRent", committed.minRent);
      if (committed.maxRent)       p.set("maximumRent", committed.maxRent);
      if (committed.minBeds)       p.set("minimumBedrooms", committed.minBeds);
      if (committed.maxBeds)       p.set("maximumBedrooms", committed.maxBeds);
      if (committed.minBaths)      p.set("minimumBathrooms", committed.minBaths);
      if (committed.maxBaths)      p.set("maximumBathrooms", committed.maxBaths);
      if (committed.minParking)    p.set("minimumParking", committed.minParking);
      if (committed.maxParking)    p.set("maximumParking", committed.maxParking);
      if (committed.minRating)     p.set("minimumRating", committed.minRating);
      if (committed.maxRating)     p.set("maximumRating", committed.maxRating);
      if (committed.sortBy)        p.set("sortBy", committed.sortBy);
      if (committed.sortBy && committed.sortOrder) p.set("sortOrder", committed.sortOrder);
      (committed.propertyTypes || []).forEach(t => p.append("propertyTypes", t));

      try {
        const res = await fetch(`${API}/rentals/search?${p}`);
        if (!res.ok) { params.failCallback(); return; }
        const json = await res.json();
        const rows = json.data || [];
        const total = json.pagination?.total ?? rows.length;
        setTotalResults(total);
        params.successCallback(rows, total);
      } catch {
        params.failCallback();
      }
    },
  }), [committed]);

  // Refresh grid when datasource changes
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.setGridOption("datasource", datasource);
    }
  }, [datasource]);

  const columnDefs = useMemo(() => [
    {
      field: "title",
      headerName: "Title",
      flex: 2,
      minWidth: 160,
      cellStyle: { fontWeight: "500", color: "#1f2937" },
      cellClass: "cursor-pointer group-hover:text-orange-600",
    },
    {
      field: "rent",
      headerName: "Rent",
      width: 110,
      cellRenderer: RentCell,
    },
    {
      field: "propertyType",
      headerName: "Type",
      width: 150,
      cellRenderer: TypeCell,
    },
    { field: "postcode", headerName: "Postcode", width: 100, cellStyle: { color: "#6b7280" } },
    { field: "state",    headerName: "State",    width: 80,  cellStyle: { color: "#6b7280" } },
    { field: "suburb",   headerName: "Suburb",   flex: 1, minWidth: 120, cellStyle: { color: "#6b7280" } },
    { field: "bathrooms",    headerName: "Baths",   width: 80,  cellStyle: { textAlign: "center", color: "#6b7280" } },
    { field: "bedrooms",     headerName: "Beds",    width: 75,  cellStyle: { textAlign: "center", color: "#6b7280" } },
    { field: "parkingSpaces",headerName: "Parking", width: 90,  cellStyle: { textAlign: "center", color: "#6b7280" } },
    {
      field: "averageRating",
      headerName: "Rating",
      width: 140,
      cellRenderer: RatingCell,
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: false,
    resizable: true,
    suppressMovable: true,
  }), []);

  const onRowClicked = useCallback((e) => {
    if (e.data?.id) navigate(`/rental/${e.data.id}`);
  }, [navigate]);

  const onGridReady = useCallback((params) => {
    params.api.setGridOption("datasource", datasource);
  }, [datasource]);

  function doSearch() {
    setCommitted({
      suburb, state, postcode,
      propertyTypes: selectedTypes,
      minRent, maxRent,
      minBeds, maxBeds,
      minBaths, maxBaths,
      minParking, maxParking,
      minRating, maxRating,
      sortBy, sortOrder,
    });
  }

  function doClear() {
    setSuburb(""); setState(""); setPostcode(""); setSelectedTypes([]);
    setMinRent(""); setMaxRent(""); setMinBeds(""); setMaxBeds("");
    setMinBaths(""); setMaxBaths(""); setMinParking(""); setMaxParking("");
    setMinRating(""); setMaxRating(""); setSortBy(""); setSortOrder("asc");
    setTotalResults(null);
    setCommitted({});
  }

  function toggleType(t) {
    setSelectedTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  }

  const inputCls = "border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-blue-400 bg-white";
  const labelCls = "block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1";

  return (
    <div className="px-4 py-6 w-full box-border overflow-x-hidden">
      <h1 className="text-4xl font-bold text-center text-gray-900 mb-6">🔍 Rental Search</h1>

      {/* ── Filter card ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl shadow-xl overflow-hidden mb-6 w-full">
        <div className="bg-blue-500 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-lg font-bold">Search Filters</span>
            {totalResults !== null && (
              <span className="ml-3 bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                {totalResults.toLocaleString()} results
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="bg-white/20 hover:bg-white/30 text-white text-sm font-bold py-1.5 px-4 border-b-2 border-white/40 rounded transition-colors"
          >
            {showAdvanced ? "▲ Hide Advanced" : "▼ Advanced Search"}
          </button>
        </div>

        <div className="bg-white p-5 space-y-5">
          {/* Basic row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Suburb</label>
              <input className={inputCls} value={suburb}
                onChange={e => setSuburb(e.target.value)}
                placeholder="e.g. Auburn"
                onKeyDown={e => e.key === "Enter" && doSearch()} />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <select className={inputCls} value={state} onChange={e => setState(e.target.value)}>
                <option value="">All States</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Postcode</label>
              <input className={inputCls} value={postcode}
                onChange={e => setPostcode(e.target.value)}
                placeholder="e.g. 2144" maxLength={4}
                onKeyDown={e => e.key === "Enter" && doSearch()} />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={doSearch}
                className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-bold py-2 px-4 border-b-4 border-orange-700 hover:border-orange-500 rounded-lg text-sm transition-colors">
                SEARCH
              </button>
              <button onClick={doClear}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 px-3 border-b-4 border-gray-300 hover:border-gray-400 rounded-lg text-sm transition-colors">
                CLEAR
              </button>
            </div>
          </div>

          {/* Property type pills */}
          <div>
            <label className={labelCls}>Property Types</label>
            <div className="flex flex-wrap gap-2">
              {propTypes.map(t => (
                <button key={t} onClick={() => toggleType(t)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition-all capitalize
                    ${selectedTypes.includes(t)
                      ? "bg-blue-500 border-blue-600 text-white shadow-sm"
                      : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced filters */}
          {showAdvanced && (
            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Advanced Filters</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ["Min Rent ($)", minRent, setMinRent, "0"],
                  ["Max Rent ($)", maxRent, setMaxRent, "Any"],
                  ["Min Bedrooms", minBeds, setMinBeds, "Any"],
                  ["Max Bedrooms", maxBeds, setMaxBeds, "Any"],
                  ["Min Bathrooms", minBaths, setMinBaths, "Any"],
                  ["Max Bathrooms", maxBaths, setMaxBaths, "Any"],
                  ["Min Parking", minParking, setMinParking, "Any"],
                  ["Max Parking", maxParking, setMaxParking, "Any"],
                ].map(([lbl, val, setter, ph]) => (
                  <div key={lbl}>
                    <label className={labelCls}>{lbl}</label>
                    <input className={inputCls} type="number" min={0} value={val}
                      onChange={e => setter(e.target.value)} placeholder={ph} />
                  </div>
                ))}
                <div>
                  <label className={labelCls}>Min Rating ★</label>
                  <input className={inputCls} type="number" min={1} max={5} step={0.5}
                    value={minRating} onChange={e => setMinRating(e.target.value)} placeholder="1" />
                </div>
                <div>
                  <label className={labelCls}>Max Rating ★</label>
                  <input className={inputCls} type="number" min={1} max={5} step={0.5}
                    value={maxRating} onChange={e => setMaxRating(e.target.value)} placeholder="5" />
                </div>
                <div>
                  <label className={labelCls}>Sort By</label>
                  <select className={inputCls} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    {SORT_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Sort Order</label>
                  <select className={inputCls} value={sortOrder}
                    onChange={e => setSortOrder(e.target.value)} disabled={!sortBy}>
                    <option value="asc">Ascending ↑</option>
                    <option value="desc">Descending ↓</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── AG Grid ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl shadow-xl overflow-hidden w-full">
        <div className="bg-blue-500 text-white px-6 py-3 flex items-center justify-between">
          <span className="font-bold text-sm">
            {totalResults !== null
              ? `${totalResults.toLocaleString()} rentals`
              : "All Rentals"}
          </span>
          <span className="text-blue-100 text-xs">Click a row to view details</span>
        </div>

        <div
          className="ag-theme-quartz w-full"
          style={{ height: 600 }}
        >
          <AgGridReact
            ref={gridRef}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowModelType="infinite"
            cacheBlockSize={10}
            maxBlocksInCache={20}
            infiniteInitialRowCount={50}
            rowHeight={50}
            headerHeight={45}
            onGridReady={onGridReady}
            onRowClicked={onRowClicked}
            rowStyle={{ cursor: "pointer" }}
            overlayLoadingTemplate='<span class="text-gray-400 text-sm">Loading rentals...</span>'
            overlayNoRowsTemplate='<span class="text-gray-400 text-sm">No rentals found. Try adjusting your filters.</span>'
          />
        </div>
      </div>
    </div>
  );
}