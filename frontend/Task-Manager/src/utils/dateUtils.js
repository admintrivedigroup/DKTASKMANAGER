const parseToDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getOrdinalSuffix = (day) => {
  if (day > 3 && day < 21) {
    return "th";
  }

  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const shortMonthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
const longMonthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export const toStartOfMinute = (value = new Date()) => {
  const date = parseToDate(value) || new Date();
  date.setSeconds(0, 0);
  return date;
};

export const addDays = (value, amount) => {
  const date = parseToDate(value) || new Date();
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + amount);
  return result;
};

export const formatDateTimeLocal = (value) => {
  const date = parseToDate(value);

  if (!date) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export const formatDateLabel = (value, fallback = "N/A") => {
  const date = parseToDate(value);

  if (!date) {
    return fallback;
  }

  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);
  const month = shortMonthFormatter.format(date);
  const year = date.getFullYear();

  return `${day}${suffix} ${month} ${year}`;
};

export const formatDateInputValue = (value) => {
  const date = parseToDate(value);

  if (!date) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const formatFullDateTime = (value) => {
  const date = parseToDate(value);

  if (!date) {
    return "";
  }

  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);
  const month = longMonthFormatter.format(date);
  const year = date.getFullYear();
  const weekday = weekdayFormatter.format(date);
  const time = date
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    })
    .replace(/^24:/, "00:");

  return `${weekday} ${day}${suffix} ${month} ${year} • ${time}`;
};

export const formatMediumDateTime = (value, fallback = "") => {
  const date = parseToDate(value);

  if (!date) {
    return fallback;
  }

  const month = shortMonthFormatter.format(date);
  const day = date.getDate();
  const year = date.getFullYear();
  const time = date
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(/^24:/, "00:");

  return `${month} ${day}, ${year} • ${time}`;
};

export const formatRelativeTimeFromNow = (value, fallback = "Just now") => {
  const date = parseToDate(value);

  if (!date) {
    return fallback;
  }

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);

  const thresholds = [
    { limit: 60, divisor: 1, unit: "second" },
    { limit: 3600, divisor: 60, unit: "minute" },
    { limit: 86400, divisor: 3600, unit: "hour" },
    { limit: 604800, divisor: 86400, unit: "day" },
    { limit: 2629800, divisor: 604800, unit: "week" },
    { limit: 31557600, divisor: 2629800, unit: "month" },
    { limit: Infinity, divisor: 31557600, unit: "year" }
  ];

  for (const threshold of thresholds) {
    if (absoluteSeconds < threshold.limit) {
      const valueToFormat = Math.round(diffSeconds / threshold.divisor);
      return relativeTimeFormatter.format(valueToFormat, threshold.unit);
    }
  }

  return fallback;
};