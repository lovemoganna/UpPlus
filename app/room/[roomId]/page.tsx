import { SAMPLE_ROOM_IDS } from "@/lib/crypto";
import RoomClient from "./RoomClient";

export function generateStaticParams() {
  return SAMPLE_ROOM_IDS.map((roomId) => ({ roomId }));
}

export default function Page() {
  return <RoomClient />;
}
