/**
 * Example React code for reading data from static JSON files
 * 
 * This file shows how to update your frontend components to read
 * from static files instead of API endpoints.
 */

// ============================================================================
// Example 1: GlobalMarkets.tsx - Reading global-flow.json
// ============================================================================

import { useState, useEffect } from "react";
import { GlobalFlowData } from "@/types";

const DATA_URL = "/data/global-flow.json";

export default function GlobalMarkets() {
  const [data, setData] = useState<GlobalFlowData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(DATA_URL);
      
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
      }
      
      const jsonData = await response.json();
      setData(jsonData);
      setLastUpdate(jsonData.timestamp || new Date().toISOString());
      
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div>
      <h1>Global Markets</h1>
      {lastUpdate && (
        <p>Last updated: {new Date(lastUpdate).toLocaleString()}</p>
      )}
      {/* Render your data here */}
    </div>
  );
}

// ============================================================================
// Example 2: IndustryFlow.tsx - Reading industry-flow.json
// ============================================================================

import { useState, useEffect } from "react";
import { IndustryFlowData } from "@/types";

const DATA_URL = "/data/industry-flow.json";

export default function IndustryFlow() {
  const [data, setData] = useState<IndustryFlowData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(DATA_URL);
      
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
      }
      
      const jsonData = await response.json();
      setData(jsonData);
      
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div>
      <h1>Industry Flow</h1>
      {/* Render your data here */}
    </div>
  );
}

// ============================================================================
// Example 3: With Cache Busting
// ============================================================================

const fetchDataWithCacheBusting = async () => {
  // Add timestamp to URL to force refresh
  const timestamp = new Date().getTime();
  const response = await fetch(`${DATA_URL}?t=${timestamp}`);
  const jsonData = await response.json();
  return jsonData;
};

// ============================================================================
// Example 4: With Fallback to API
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";

const fetchDataWithFallback = async () => {
  try {
    // Try API first
    const response = await fetch(`${API_BASE_URL}/api/global-flow`);
    
    if (!response.ok) {
      throw new Error("API unavailable");
    }
    
    const jsonData = await response.json();
    return jsonData;
    
  } catch (apiError) {
    // Fallback to static file
    try {
      const response = await fetch("/data/global-flow.json");
      const jsonData = await response.json();
      console.warn("Using static data file (API unavailable)");
      return jsonData;
    } catch (staticError) {
      throw new Error("Failed to load data from API or static file");
    }
  }
};

// ============================================================================
// Example 5: With Retry Logic
// ============================================================================

const fetchDataWithRetry = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(DATA_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const jsonData = await response.json();
      return jsonData;
      
    } catch (err) {
      if (i === retries - 1) {
        throw err;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

// ============================================================================
// Example 6: Custom Hook
// ============================================================================

import { useState, useEffect } from "react";

function useStaticData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.statusText}`);
        }
        
        const jsonData = await response.json();
        setData(jsonData);
        
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, isLoading, error };
}

// Usage:
export default function MyComponent() {
  const { data, isLoading, error } = useStaticData<GlobalFlowData>("/data/global-flow.json");

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data available</div>;

  return <div>{/* Render data */}</div>;
}

// ============================================================================
// Example 7: With TypeScript Types
// ============================================================================

interface GlobalFlowData {
  timestamp: string;
  regions: Array<{
    id: string;
    name: string;
    stockIndex: number;
    stockChange: number;
    currency: string;
    currencyStrength: number;
    bondYield: number;
  }>;
  flows: Array<{
    source: string;
    target: string;
    amount: number;
    assetType: string;
    netFlowPercent: number;
  }>;
}

const fetchTypedData = async (): Promise<GlobalFlowData> => {
  const response = await fetch("/data/global-flow.json");
  const data: GlobalFlowData = await response.json();
  return data;
};

// ============================================================================
// Example 8: With Error Boundary
// ============================================================================

import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div role="alert">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <GlobalMarkets />
    </ErrorBoundary>
  );
}

