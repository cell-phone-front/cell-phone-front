import "@/styles/globals.css";
import TopBar from "./top-bar";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const hideTopBar = router.pathname === "/login" || router.pathname === "/";

  return (
    <div className="h-screen overflow-hidden">
      {!hideTopBar && (
        <div className="fixed top-0 left-0 right-0 z-50 h-14">
          <TopBar />
        </div>
      )}

      <main className="h-screen overflow-hidden">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
