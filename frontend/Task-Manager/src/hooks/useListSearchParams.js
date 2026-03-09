import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const identity = (value) => value;

const parseResult = (rawValue, configEntry) => {
  const {
    defaultValue = "",
    parse = identity,
  } = configEntry || {};

  if (rawValue === null || rawValue === "") {
    return {
      value: defaultValue,
      shouldNormalize: rawValue === "",
    };
  }

  try {
    const parsedValue = parse(rawValue);
    return {
      value: parsedValue ?? defaultValue,
      shouldNormalize: parsedValue == null,
    };
  } catch {
    return {
      value: defaultValue,
      shouldNormalize: true,
    };
  }
};

const shouldRemoveParam = (value, configEntry) => {
  const defaultValue = configEntry?.defaultValue;

  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value === defaultValue
  );
};

const normalizeUpdatePayload = (updates, currentState) =>
  typeof updates === "function" ? updates(currentState) : updates;

const getCanonicalValue = (rawValue, configEntry) => {
  const parsed = parseResult(rawValue, configEntry);

  if (shouldRemoveParam(parsed.value, configEntry)) {
    return {
      parsedValue: parsed.value,
      serializedValue: null,
      shouldNormalize: parsed.shouldNormalize || rawValue !== null,
    };
  }

  const serialize =
    configEntry?.serialize || ((value) => String(value));
  const serializedValue = serialize(parsed.value);

  return {
    parsedValue: parsed.value,
    serializedValue,
    shouldNormalize: parsed.shouldNormalize || rawValue !== serializedValue,
  };
};

const useListSearchParams = (config = {}, options = {}) => {
  const { replace = true } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    return Object.entries(config).reduce((accumulator, [key, entry]) => {
      accumulator[key] = getCanonicalValue(searchParams.get(key), entry).parsedValue;
      return accumulator;
    }, {});
  }, [config, searchParams]);

  useEffect(() => {
    const normalized = new URLSearchParams(searchParams);
    let hasChanges = false;

    Object.entries(config).forEach(([key, entry]) => {
      const rawValue = searchParams.get(key);
      const { serializedValue, shouldNormalize } = getCanonicalValue(rawValue, entry);

      if (!shouldNormalize) {
        return;
      }

      hasChanges = true;

      if (serializedValue === null) {
        normalized.delete(key);
        return;
      }

      normalized.set(key, serializedValue);
    });

    if (!hasChanges) {
      return;
    }

    if (normalized.toString() === searchParams.toString()) {
      return;
    }

    setSearchParams(normalized, { replace: true });
  }, [config, searchParams, setSearchParams]);

  const updateParams = useCallback(
    (updates, navigationOptions = {}) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          const currentState = Object.entries(config).reduce(
            (accumulator, [key, entry]) => {
              accumulator[key] = getCanonicalValue(previous.get(key), entry).parsedValue;
              return accumulator;
            },
            {}
          );
          const resolvedUpdates =
            normalizeUpdatePayload(updates, currentState) || {};

          Object.entries(resolvedUpdates).forEach(([key, value]) => {
            const entry = config[key];
            if (!entry) {
              return;
            }

            if (shouldRemoveParam(value, entry)) {
              next.delete(key);
              return;
            }

            const serialize = entry.serialize || ((rawValue) => String(rawValue));
            next.set(key, serialize(value));
          });

          if (next.toString() === previous.toString()) {
            return previous;
          }

          return next;
        },
        { replace: navigationOptions.replace ?? replace }
      );
    },
    [config, replace, setSearchParams]
  );

  const setParam = useCallback(
    (key, value, navigationOptions = {}) => {
      updateParams({ [key]: value }, navigationOptions);
    },
    [updateParams]
  );

  const resetParams = useCallback(
    (keys = Object.keys(config), navigationOptions = {}) => {
      updateParams(
        Object.fromEntries(keys.map((key) => [key, config[key]?.defaultValue])),
        navigationOptions
      );
    },
    [config, updateParams]
  );

  return {
    state,
    setParam,
    setParams: updateParams,
    resetParams,
  };
};

export default useListSearchParams;
