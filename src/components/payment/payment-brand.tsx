import Image from "next/image";

import goneViralLogo from "@/app/GoneViral.in logo.png";

export function PaymentBrand() {
  return (
    <div className="payment-brand" aria-label="GoneViral.in">
      <Image
        alt=""
        className="payment-brand-logo"
        height={40}
        priority
        src={goneViralLogo}
        width={40}
      />
      <span>
        Gone<span>Viral</span>.in
      </span>
    </div>
  );
}
