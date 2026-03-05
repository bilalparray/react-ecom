import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider, dehydrate } from "@tanstack/react-query";
import { StrictMode } from "react";
import App from "./App";
import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

export async function render(url: string) {
  // Create a new QueryClient for each request
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Disable refetching on server
        staleTime: Infinity,
        gcTime: Infinity,
        // Don't retry on server - let client handle errors
        retry: false,
      },
    },
  });

  // Render the app
  // Note: Since hooks use useEffect (not React Query), they won't run during SSR
  // Data will be fetched on the client after hydration
  const html = renderToString(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </QueryClientProvider>
    </StrictMode>
  );

  // Dehydrate the query client state (will be empty since hooks don't use React Query)
  const dehydratedState = dehydrate(queryClient);
  // Stringify for safe injection into HTML
  const queryState = JSON.stringify(dehydratedState);

  return {
    html,
    queryState,
  };
}
