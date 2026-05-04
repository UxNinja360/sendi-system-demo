import { RouterProvider } from "react-router";
import { router } from "./routes";
import { useEffect } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";

export default function App() {
  useEffect(() => {
    document.documentElement.setAttribute("lang", "he");
    document.documentElement.setAttribute("dir", "rtl");
    localStorage.removeItem("language");
    // PWA will only be active after build (not in dev mode)
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <SpeedInsights />
    </>
  );
}
