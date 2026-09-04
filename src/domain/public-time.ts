const IST_TIME_ZONE = "Asia/Kolkata";

function uppercaseMeridiem(value: string) {
  return value.replace(/\b(am|pm)\b/gi, (period) => period.toUpperCase());
}

export function formatIstTime(value: string) {
  return uppercaseMeridiem(
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hour12: true,
      minute: "2-digit",
      timeZone: IST_TIME_ZONE,
    }).format(new Date(value)),
  );
}

export function formatIstDateTime(value: string) {
  return uppercaseMeridiem(
    new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      timeZone: IST_TIME_ZONE,
    })
      .format(new Date(value))
      .replace(",", " ·"),
  );
}
