import { redirect } from "next/navigation";

// The dashboard has no public home page: send visitors to the store.
// Swap to https://splashycam.shop once the domain is connected in Shopify.
const STORE_URL = "https://splashy-cam.myshopify.com";

export default function Home() {
  redirect(STORE_URL);
}
