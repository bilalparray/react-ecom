import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider, HydrationBoundary } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";

// Get the dehydrated state from the window
// The server injects it as: window.__REACT_QUERY_STATE__ = {...}
// JSON.stringify produces valid JavaScript, so it's already parsed as an object
const dehydratedState = typeof window !== "undefined" ? (window as any).__REACT_QUERY_STATE__ : undefined;

// Create a new QueryClient for the client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes to avoid unnecessary refetches
      staleTime: 5 * 60 * 1000,
      // Don't refetch on mount if we have data from SSR
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

hydrateRoot(
  root,
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {dehydratedState ? (
        <HydrationBoundary state={dehydratedState}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </HydrationBoundary>
      ) : (
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )}
    </QueryClientProvider>
  </StrictMode>
);
