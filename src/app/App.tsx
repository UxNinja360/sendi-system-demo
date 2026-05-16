import { RouterProvider } from "react-router";
import { router } from "./routes";
import { useEffect } from "react";
import { installHapticFeedback } from "./utils/haptics";
import { AppUpdateBanner } from "./components/common/app-update-banner";

export default function App() {
  useEffect(() => {
    document.documentElement.setAttribute("lang", "he");
    document.documentElement.setAttribute("dir", "rtl");
    try {
      localStorage.removeItem("language");
    } catch {
      // Some browser modes block storage; the app should still render.
    }
    // PWA will only be active after build (not in dev mode)

    return installHapticFeedback();
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <AppUpdateBanner />
    </>
  );
}
