export const getCurrentPathWithQuery = (location) => {
  const pathname =
    typeof location?.pathname === "string" ? location.pathname : "";
  const search =
    typeof location?.search === "string" && location.search !== "?"
      ? location.search
      : "";

  return `${pathname}${search}`;
};

export const buildReturnLocation = (location) => getCurrentPathWithQuery(location);

export const createFromNavigationState = (location, extraState = {}) => ({
  ...extraState,
  from:
    typeof location?.state?.from === "string" && location.state.from.trim()
      ? location.state.from.trim()
      : buildReturnLocation(location),
});

export const navigateWithReturn = (
  navigate,
  to,
  location,
  options = {}
) => {
  navigate(to, {
    ...options,
    state: createFromNavigationState(location, options.state || {}),
  });
};

export const getBackNavigationTarget = (location, fallbackPath) => {
  const from =
    typeof location?.state?.from === "string" ? location.state.from.trim() : "";

  return from || fallbackPath;
};
