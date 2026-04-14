import RoomClient from "./RoomClient";

export function generateStaticParams() {
  return [{ roomId: "upplus" }];
}

export default function Page() {
  return <RoomClient />;
}
