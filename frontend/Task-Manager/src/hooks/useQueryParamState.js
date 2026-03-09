import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const identity = (value) => value;

const parseCurrentValue = (rawValue, parse, defaultValue) => {
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

const shouldDeleteParam = (value, defaultValue) =>
  value === undefined ||
  value === null ||
  value === "" ||
  value === defaultValue;

const getCanonicalValue = (rawValue, parse, defaultValue, serialize) => {
  const parsed = parseCurrentValue(rawValue, parse, defaultValue);

  if (shouldDeleteParam(parsed.value, defaultValue)) {
    return {
      parsedValue: parsed.value,
      serializedValue: null,
      shouldNormalize: parsed.shouldNormalize || rawValue !== null,
    };
  }

  const serializedValue = serialize(parsed.value);

  return {
    parsedValue: parsed.value,
    serializedValue,
    shouldNormalize: parsed.shouldNormalize || rawValue !== serializedValue,
  };
};

const useQueryParamState = (key, options = {}) => {
  const {
    defaultValue = "",
    parse = identity,
    serialize = (value) => String(value),
    replace = true,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  const value = useMemo(
    () =>
      getCanonicalValue(
        searchParams.get(key),
        parse,
        defaultValue,
        serialize
      ).parsedValue,
    [defaultValue, key, parse, searchParams, serialize]
  );

  const setValue = useCallback(
    (nextValueOrUpdater, navigationOptions = {}) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          const currentValue = getCanonicalValue(
            previous.get(key),
            parse,
            defaultValue,
            serialize
          ).parsedValue;
          const resolvedValue =
            typeof nextValueOrUpdater === "function"
              ? nextValueOrUpdater(currentValue)
              : nextValueOrUpdater;

          if (shouldDeleteParam(resolvedValue, defaultValue)) {
            next.delete(key);
          } else {
            next.set(key, serialize(resolvedValue));
          }

          if (next.toString() === previous.toString()) {
            return previous;
          }

          return next;
        },
        { replace: navigationOptions.replace ?? replace }
      );
    },
    [defaultValue, key, parse, replace, serialize, setSearchParams]
  );

  return [value, setValue];
};

export default useQueryParamState;
