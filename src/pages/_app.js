import "@/styles/globals.css";
import TopBar from "./top-bar";

export default function App({ Component, pageProps }) {
  return (
    <div className="h-screen overflow-hidden">
      <div className="fixed top-0 left-0 right-0 z-50 h-16">
        <TopBar />
      </div>

      <main className="overflow-hidden">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
