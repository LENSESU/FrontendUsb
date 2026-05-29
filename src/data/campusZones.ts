import campusZonesData from "./campusZones.json";

export type CampusZone = {
	value: string;
	label: string;
	lat: number | null;
	lng: number | null;
};

export type CampusZonesConfig = {
	zoneRadiusM: number;
	usbCenter: { lat: number; lng: number };
	zones: CampusZone[];
};

export const campusZonesConfig = campusZonesData as CampusZonesConfig;

/** Zonas del campus (fuente: campusZones.json) */
export const CAMPUS_ZONES = campusZonesConfig.zones;

export const USB_CENTER = campusZonesConfig.usbCenter;

export const ZONE_RADIUS_M = campusZonesConfig.zoneRadiusM;

export function getCampusZoneByValue(value: string): CampusZone | undefined {
	return CAMPUS_ZONES.find((z) => z.value === value);
}
