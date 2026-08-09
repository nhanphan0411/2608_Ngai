export const dynamic = "force-dynamic";
import Link from "next/link";
import Image from 'next/image'

const src_desktop =
  "https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/hero-dektop.png";

const src_mobile =
  "https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/hero-mobile.png";

export default function Home() {
  return (
    <main className="relative h-screen w-screen">
      <Image
          src={src_desktop}
          alt="Ngài"
          priority
          fill
          sizes="100vw"
          className="desktop-only object-cover"
          quality={100}
        />
      <Image
          src={src_mobile}
          alt="Ngài"
          priority
          fill
          sizes="100vw"
          quality={100}
          className="mobile-only object-cover"
        />

      <div className="fixed inset-0 z-10 flex flex-column items-center justify-center">
        {/* <p>coming soon... </p>
        <br></br>
        <p>get latest news from our social</p> */}
      </div>
      
    </main>
  );
}

