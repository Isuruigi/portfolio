import Hero from "@/components/sections/Hero";
import ProofStrip from "@/components/sections/ProofStrip";
import Reel from "@/components/sections/Reel";
import Work from "@/components/sections/Work";
import RunIt from "@/components/sections/RunIt";
import Atlas from "@/components/sections/Atlas";
import Career from "@/components/sections/Career";
import InTheRoom from "@/components/sections/InTheRoom";
import About from "@/components/sections/About";
import Blog from "@/components/sections/Blog";
import Newsroom from "@/components/sections/Newsroom";
import FreeStuff from "@/components/sections/FreeStuff";
import Faq from "@/components/sections/Faq";
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
      <RunIt />
      <Atlas />
      <Career />
      <InTheRoom />
      <About />
      <Blog />
      <Newsroom />
      <FreeStuff />
      <Faq />
      <Contact />
      <Footer />
    </main>
  );
}
