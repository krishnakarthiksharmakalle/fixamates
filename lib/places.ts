export const KINDS = {
  plumber: "plumber",
  electrician: "electrician",
  appliance: "appliance repair",
  handyman: "handyman",
} as const;
export type Kind = keyof typeof KINDS;

export type Place = { id: string; name: string; address: string; lat: number; lng: number; rating?: number; url?: string; phone?: string };

export async function searchNearby(lat: number, lng: number, kind: Kind): Promise<Place[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY ?? "",
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.googleMapsUri,places.nationalPhoneNumber",
    },
    body: JSON.stringify({
      textQuery: KINDS[kind],
      maxResultCount: 10,
      locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 8000 } },
    }),
  });
  if (!res.ok) throw new Error(`Places request failed (${res.status})`);
  const data = (await res.json()) as { places?: {
    id: string; displayName: { text: string }; formattedAddress: string;
    location: { latitude: number; longitude: number }; rating?: number; googleMapsUri?: string; nationalPhoneNumber?: string;
  }[] };
  return (data.places ?? []).map((p) => ({
    id: p.id, name: p.displayName.text, address: p.formattedAddress,
    lat: p.location.latitude, lng: p.location.longitude,
    rating: p.rating, url: p.googleMapsUri, phone: p.nationalPhoneNumber,
  }));
}
