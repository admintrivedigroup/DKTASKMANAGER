const FY_MONTH_OPTIONS = [
  { value: "all", label: "All Months" },
  { value: "apr", label: "Apr", monthNumber: 4 },
  { value: "may", label: "May", monthNumber: 5 },
  { value: "jun", label: "Jun", monthNumber: 6 },
  { value: "jul", label: "Jul", monthNumber: 7 },
  { value: "aug", label: "Aug", monthNumber: 8 },
  { value: "sep", label: "Sep", monthNumber: 9 },
  { value: "oct", label: "Oct", monthNumber: 10 },
  { value: "nov", label: "Nov", monthNumber: 11 },
  { value: "dec", label: "Dec", monthNumber: 12 },
  { value: "jan", label: "Jan", monthNumber: 1 },
  { value: "feb", label: "Feb", monthNumber: 2 },
  { value: "mar", label: "Mar", monthNumber: 3 },
];

const FY_MONTH_VALUE_TO_NUMBER = FY_MONTH_OPTIONS.reduce((accumulator, option) => {
  if (option.value !== "all") {
    accumulator[option.value] = option.monthNumber;
  }
  return accumulator;
}, {});

const getFinancialYearStartYear = (dateValue = new Date()) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return new Date().getMonth() >= 3
      ? new Date().getFullYear()
      : new Date().getFullYear() - 1;
  }

  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  return monthIndex >= 3 ? year : year - 1;
};

const formatFinancialYearLabel = (startYear) => {
  const endYearShort = String((Number(startYear) + 1) % 100).padStart(2, "0");
  return `FY ${startYear}-${endYearShort}`;
};

const buildFinancialYearOptions = ({
  centerYear = getFinancialYearStartYear(),
  yearsBefore = 1,
  yearsAfter = 1,
} = {}) => {
  const normalizedCenter = Number(centerYear);
  if (!Number.isInteger(normalizedCenter)) {
    return [];
  }

  const options = [];
  for (
    let startYear = normalizedCenter - yearsBefore;
    startYear <= normalizedCenter + yearsAfter;
    startYear += 1
  ) {
    options.push({
      value: String(startYear),
      startYear,
      label: formatFinancialYearLabel(startYear),
    });
  }
  return options;
};

const buildFinancialYearDateRange = (startYearInput, monthValue = "all") => {
  const startYear = Number.parseInt(String(startYearInput), 10);
  if (!Number.isInteger(startYear)) {
    return { startDate: null, endDate: null };
  }

  if (!monthValue || monthValue === "all") {
    return {
      startDate: new Date(Date.UTC(startYear, 3, 1, 0, 0, 0, 0)),
      endDate: new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999)),
    };
  }

  const monthNumber = FY_MONTH_VALUE_TO_NUMBER[monthValue];
  if (!monthNumber) {
    return { startDate: null, endDate: null };
  }

  const monthYear = monthNumber >= 4 ? startYear : startYear + 1;
  const monthIndex = monthNumber - 1;
  const daysInMonth = new Date(Date.UTC(monthYear, monthIndex + 1, 0)).getUTCDate();

  return {
    startDate: new Date(Date.UTC(monthYear, monthIndex, 1, 0, 0, 0, 0)),
    endDate: new Date(
      Date.UTC(monthYear, monthIndex, daysInMonth, 23, 59, 59, 999)
    ),
  };
};

export {
  FY_MONTH_OPTIONS,
  FY_MONTH_VALUE_TO_NUMBER,
  getFinancialYearStartYear,
  formatFinancialYearLabel,
  buildFinancialYearOptions,
  buildFinancialYearDateRange,
};
