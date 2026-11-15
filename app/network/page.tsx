import NetworkClient from "@/components/NetworkClient";
import { getCoauthorData } from "@/data/coauthors";

export const metadata = {
  title: "Co-author network | Javier Conde",
};

export default function NetworkPage() {
  return <NetworkClient data={getCoauthorData()} />;
}
