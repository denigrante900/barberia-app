import { PinGate } from "@/components/PinGate";

export default function BarberoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PinGate>{children}</PinGate>;
}
