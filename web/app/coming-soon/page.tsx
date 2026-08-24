export const dynamic = "force-dynamic";

import Image from "next/image";

const src_desktop =
  "https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/hero-dektop.png";

const src_mobile =
  "https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/hero-mobile.png";

const src_hero_logo =
  "https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/ngailogo-cursive-l.png";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Desktop background */}
      <Image
        src={src_desktop}
        alt=""
        fill
        priority
        className="hidden object-cover md:block"
      />

      {/* Mobile background */}
      <Image
        src={src_mobile}
        alt=""
        fill
        priority
        className="object-cover md:hidden"
      />

      {/* Centered logo */}
      <div className="fixed inset-0 z-10 flex flex-col items-center justify-center px-4">
        <Image
          src={src_hero_logo}
          alt="Ngài"
          width={1000}
          height={400}
          priority
          className="h-auto w-[80vw] md:w-[50vw]"
        />
        <div className="mt-2 flex w-[80vw] justify-between text-sm mobile-only">
          <p>coming soon</p>
          <div>
          <a
            href="https://www.instagram.com/ngaiofficial/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            keep in touch
          </a>
          </div>
        </div>
      </div>


      {/* Bottom content */}
      <div className="fixed bottom-6 left-0 right-0 z-10 flex flex-col items-center text-center desktop-only">
        <p className="text-sm">
          coming soon
        </p>

        <p className="mt-2 text-sm">
          <a href="https://www.instagram.com/ngaiofficial/" target="_blank" className="underline">instagram</a> / <a href="mailto:hello@houseofngai.com" target="_blank" className="underline">email</a>
        </p>
      </div>
    </main>
  );
}