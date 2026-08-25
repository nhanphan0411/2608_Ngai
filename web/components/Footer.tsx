"use client";

import CountrySelector from "@/components/CountrySelector";

export default function Footer() {
  const links = [
    "TERMS & CONDITIONS",
    "SHIPPING & RETURNS",
    "PRIVACY POLICY",
  ];

  return (
    <footer className="md:h-[100px] md:py-0 py-4 max-sm:py-20 h-auto border-t border-black">
      <div className="grid sm:h-full h-auto sm:gap-0 gap-4 grid-cols-1 md:grid-cols-5">

        {links.map((link) => (
          <a
            key={link}
            href="#"
            className="flex items-center justify-center px-5 text-center text-sm hover:underline"
          >
            {link}
          </a>
        ))}

        {/* Country */}
        <div className="flex items-center justify-center px-5 text-sm gap-1 ">
          DELIVER TO: <CountrySelector />
        </div>

        {/* Copyright */}
        <p className="flex items-center justify-center px-5 text-center text-sm">
          (c) NGÀI 2026
        </p>

        {/* BCT Logo */}
        {/* <div className="flex items-center justify-center px-5">
          <img
            src="/bct_logo.png"
            alt="Bộ Công Thương"
            className="md:w-[50%] w-[40%]"
          />
        </div> */}

      </div>
    </footer>
  );
}