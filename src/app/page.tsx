import Hero from "@/components/sections/Hero";
import ProofStrip from "@/components/sections/ProofStrip";
import Reel from "@/components/sections/Reel";
import Work from "@/components/sections/Work";
import Career from "@/components/sections/Career";
import InTheRoom from "@/components/sections/InTheRoom";
import About from "@/components/sections/About";
import Blog from "@/components/sections/Blog";
import Newsroom from "@/components/sections/Newsroom";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/sections/Footer";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <ProofStrip />
      <Reel />
      <Work />
      <Career />
      <InTheRoom />
      <About />
      <Blog />
      <Newsroom />
      <Contact />
      <Footer />
    </main>
  );
}
