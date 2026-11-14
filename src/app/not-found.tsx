import Link from "next/link";
import { IconNext } from "@/components/kit/house-icons";
import { Puff } from "@/components/kit/Puff";

export default function NotFound() {
  return (
    <div className="lite-whole">
      <Puff who="chief" pose="shrug" size={140} />
      <p className="t-line">There&apos;s nothing at this address.</p>
      <Link href="/" className="text-action">Overview<IconNext /></Link>
    </div>
  );
}
