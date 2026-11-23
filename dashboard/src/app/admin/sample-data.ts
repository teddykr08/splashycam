export type Host = { name: string; school: string; code: string; token: string };
export const initialHosts: Host[] = [
  { name: "Riley Vale", school: "Coral Bay High", code: "CORAL", token: "demo-coral" },
  { name: "Avery Pine", school: "Juniper High", code: "JUNIPER", token: "demo-juniper" },
];

export const boxes = [
  { id: "CB-02", host: "CORAL", status: "Collecting orders" },
  { id: "CB-01", host: "CORAL", status: "Delivered to host" },
  { id: "JH-01", host: "JUNIPER", status: "Delivered to host" },
];

type Order = {
  id: string; buyer: string; host: string; date: string; box: string | null;
  delivery: string; payout: "Pending" | "Eligible" | "Paid"; cents: number;
};

export const orders: Order[] = [
  { id: "105", buyer: "Finch M.", host: "CORAL", date: "Jan 12", box: "CB-02", delivery: "Awaiting shipment", payout: "Pending", cents: 300 },
  { id: "104", buyer: "River N.", host: "JUNIPER", date: "Jan 10", box: "JH-01", delivery: "Host recorded pickup", payout: "Pending", cents: 300 },
  { id: "103", buyer: "Alex P.", host: "CORAL", date: "Jan 8", box: null, delivery: "Buyer confirmed receipt", payout: "Eligible", cents: 150 },
  { id: "102", buyer: "Sage K.", host: "CORAL", date: "Jan 7", box: "CB-01", delivery: "Buyer confirmed receipt", payout: "Eligible", cents: 300 },
  { id: "101", buyer: "Robin T.", host: "JUNIPER", date: "Jan 3", box: "JH-01", delivery: "Buyer confirmed receipt", payout: "Paid", cents: 300 },
];

export const money = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
