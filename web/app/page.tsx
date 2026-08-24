export const dynamic = "force-dynamic";

import Image from "next/image";
import { DesktopNav, MobileNav } from "@/components/home/HomeNav";

const src_desktop =
  "https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/hero-dektop.png";

const src_mobile =
  "https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/hero-mobile.png";

const src_hero_logo =
  "https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/ngailogo-cursive-l.png";

export default function Home() {
  return (
    <main className="relative w-full">
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="relative h-screen w-full overflow-hidden">
          <Image
            src={src_desktop}
            alt=""
            fill
            priority
            className="object-cover"
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-4">
            <Image
              src={src_hero_logo}
              alt="Ngài"
              width={1000}
              height={400}
              priority
              className="h-auto w-[50vw]"
            />

            <div className="w-[50vw]">
              <DesktopNav />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="relative flex h-[100dvh] w-full items-start justify-center overflow-hidden md:hidden">
        <Image
          src={src_mobile}
          alt=""
          fill
          priority
          className="object-cover"
        />

        {/* Logo */}
        <div className="relative z-10 flex w-full justify-center pt-[8vh]">
          <Image
            src={src_hero_logo}
            alt="Ngài"
            width={1000}
            height={800}
            priority
            className="h-auto w-[220vw] rotate-90 mt-[20vh]"
          />
        </div>

        {/* Navigation */}
        <div className="absolute inset-x-0 bottom-10 z-10 flex justify-center px-4">
          <div className="w-[80vw]">
            <MobileNav />
          </div>
        </div>
      </div>
    </main>
  );
}