import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { GeoPoint } from "@/lib/types";

export type LocationPermissionState = "unknown" | "granted" | "denied";

export interface LiveLocationState {
  location: GeoPoint | null;
  permission: LocationPermissionState;
}

/**
 * 実機の現在地（GPS）を継続的に取得する。
 * バッテリー消費を抑えるため、精度は Balanced・更新間隔は最短15秒/30m移動とする。
 */
export function useLiveLocation(): LiveLocationState {
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [permission, setPermission] = useState<LocationPermissionState>("unknown");

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== "granted") {
        setPermission("denied");
        return;
      }
      setPermission("granted");
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 30 },
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return { location, permission };
}
