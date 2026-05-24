import type { LucideIcon } from "lucide-react";
import { EthernetPort, Globe, Wifi } from "lucide-react";
import type { DriverInfo, NetworkInterface } from "../types";

export type ConnectionKind = NetworkInterface["kind"];

const resolveKind = (iface: NetworkInterface): ConnectionKind => {
  if (iface.kind === "wifi" || iface.kind === "ethernet") {
    return iface.kind;
  }

  const name = iface.name.toLowerCase();
  if (
    name.includes("wi-fi") ||
    name.includes("wifi") ||
    name.includes("wlan") ||
    name.includes("wireless") ||
    name.includes("802.11")
  ) {
    return "wifi";
  }
  if (
    name.includes("ethernet") ||
    name.includes("gigabit") ||
    name.includes("connexion au réseau local") ||
    name.includes("local area connection") ||
    name.includes("gbe")
  ) {
    return "ethernet";
  }
  return "other";
};

export const getConnectionMeta = (kind: ConnectionKind) => {
  switch (kind) {
    case "wifi":
      return {
        label: "Wi‑Fi actif",
        shortLabel: "Wi‑Fi",
        Icon: Wifi,
      };
    case "ethernet":
      return {
        label: "Ethernet actif",
        shortLabel: "Ethernet",
        Icon: EthernetPort,
      };
    default:
      return {
        label: "Réseau actif",
        shortLabel: "Réseau",
        Icon: Globe,
      };
  }
};

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u2011/g, "-")
    .trim();

const isGenericInterfaceName = (
  name: string,
  kind: ConnectionKind,
  shortLabel: string,
) => {
  const normalized = normalizeName(name);
  const label = normalizeName(shortLabel);

  if (normalized === label) return true;

  const genericNames = new Set([
    "ethernet",
    "wi-fi",
    "wifi",
    "wlan",
    "network",
    "reseau",
    "connexion au reseau local",
    "local area connection",
  ]);

  if (genericNames.has(normalized)) return true;

  if (kind === "ethernet" && normalized === "ethernet") return true;
  if (kind === "wifi" && (normalized === "wi-fi" || normalized === "wifi")) {
    return true;
  }

  return false;
};

export const formatConnectionSubtitle = (
  connection: ActiveConnection,
): string => {
  const showName = !isGenericInterfaceName(
    connection.name,
    connection.kind,
    connection.shortLabel,
  );

  let text = showName
    ? `${connection.shortLabel} · ${connection.name}`
    : connection.label;

  if (connection.extraCount > 0) {
    text += ` · +${connection.extraCount} autre${connection.extraCount > 1 ? "s" : ""}`;
  }

  return text;
};

/** Sous-titre widget Réseau — type + carte active, nom complet. */
export const formatNetworkWidgetSubtitle = (
  connection: ActiveConnection | null,
  adapterName: string | null,
): string => {
  if (!connection) return "Aucune interface détectée";

  let text = adapterName
    ? `${connection.shortLabel} · ${adapterName}`
    : formatConnectionSubtitle(connection);

  if (adapterName && connection.extraCount > 0) {
    text += ` · +${connection.extraCount} autre${connection.extraCount > 1 ? "s" : ""}`;
  }

  return text;
};

export interface ActiveConnection {
  kind: ConnectionKind;
  name: string;
  label: string;
  shortLabel: string;
  Icon: LucideIcon;
  extraCount: number;
}

export const getActiveConnection = (
  interfaces: NetworkInterface[],
): ActiveConnection | null => {
  if (interfaces.length === 0) return null;

  const sorted = [...interfaces].sort(
    (a, b) =>
      b.received +
      b.transmitted -
      (a.received + a.transmitted),
  );

  const primary = sorted[0];
  const kind = resolveKind(primary);
  const meta = getConnectionMeta(kind);

  return {
    kind,
    name: primary.name,
    label: meta.label,
    shortLabel: meta.shortLabel,
    Icon: meta.Icon,
    extraCount: interfaces.length - 1,
  };
};

const isWifiDriverName = (name: string) =>
  /wi.?fi|wlan|wireless|802\.11/i.test(name);

const isEthernetDriverName = (name: string) =>
  !isWifiDriverName(name) &&
  /ethernet|gbe|gigabit|2\.5g|10g|base.?t|network adapter/i.test(name);

/** Nom matériel de la carte réseau correspondant à la connexion active. */
export const getActiveNetworkAdapterName = (
  drivers: DriverInfo[],
  connection: ActiveConnection | null,
): string | null => {
  if (!connection) return null;

  const networkDrivers = drivers.filter((d) => d.category === "Network");

  let matched: DriverInfo | undefined;
  if (connection.kind === "wifi") {
    matched = networkDrivers.find((d) => isWifiDriverName(d.name));
  } else if (connection.kind === "ethernet") {
    matched = networkDrivers.find((d) => isEthernetDriverName(d.name));
  }

  if (matched) return matched.name;

  if (
    !isGenericInterfaceName(
      connection.name,
      connection.kind,
      connection.shortLabel,
    )
  ) {
    return connection.name;
  }

  return networkDrivers[0]?.name ?? null;
};
