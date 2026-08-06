/**
 * Courier list for §4.3.1. The platform does not integrate with any carrier
 * API — §4.3.2 puts the user on the courier's own tracking page with the
 * number in hand, which keeps this to a link table and costs nothing to run.
 */
export interface Courier {
  id: string;
  name: string;
  /** Where §4.3.2 sends the user to check the parcel themselves. */
  trackingUrl: string;
}

export const COURIERS: Courier[] = [
  { id: "thailand-post", name: "ไปรษณีย์ไทย", trackingUrl: "https://track.thailandpost.co.th/" },
  { id: "kerry", name: "Kerry Express", trackingUrl: "https://th.kerryexpress.com/th/track/" },
  { id: "flash", name: "Flash Express", trackingUrl: "https://www.flashexpress.com/tracking/" },
  { id: "j-and-t", name: "J&T Express", trackingUrl: "https://www.jtexpress.co.th/index/query/gzquery.html" },
  { id: "ninja-van", name: "Ninja Van", trackingUrl: "https://www.ninjavan.co/th-th/tracking" },
  { id: "scg", name: "SCG Express", trackingUrl: "https://www.scgexpress.co.th/tracking" },
];

export function getCourier(name: string): Courier | undefined {
  return COURIERS.find((courier) => courier.name === name || courier.id === name);
}
