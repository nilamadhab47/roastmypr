import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { ConfessionWall } from "@/components/confession-wall";
import { RoastLevels } from "@/components/roast-levels";
import { Archetypes } from "@/components/archetypes";
import { GifWall } from "@/components/gif-wall";
import { YoutubeReactions } from "@/components/youtube-reactions";
import { VSBattle } from "@/components/vs-battle";
import { ReviewerThoughts } from "@/components/reviewer-thoughts";
import { HowItWorks } from "@/components/how-it-works";
import { JevGate } from "@/components/jev-gate";
import { FinalCTA } from "@/components/final-cta";
import { Footer } from "@/components/footer";
import { EasterEggs } from "@/components/easter-eggs";
import { SoundProvider } from "@/components/sound-provider";
import { RickrollIntro } from "@/components/rickroll-intro";

export default function Home() {
  return (
    <SoundProvider>
      <RickrollIntro>
        <Navbar />
        <main>
          <Hero />
          <JevGate />
          <ConfessionWall />
          <RoastLevels />
          <Archetypes />
          <GifWall />
          <YoutubeReactions />
          <ReviewerThoughts />
          <VSBattle />
          <HowItWorks />
          <FinalCTA />
        </main>
        <Footer />
        <EasterEggs />
      </RickrollIntro>
    </SoundProvider>
  );
}
