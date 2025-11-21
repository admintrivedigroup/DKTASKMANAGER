import { useCallback, useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

const useActiveNotices = (autoFetch = true) => {
  const [activeNotices, setActiveNotices] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(false);

  const fetchActiveNotices = useCallback(async () => {
    try {
      setLoadingNotices(true);
      const response = await axiosInstance.get(API_PATHS.NOTICES.GET_ACTIVE);
      setActiveNotices(response.data?.notices || []);
    } catch (error) {
      console.error("Failed to fetch active notices", error);
    } finally {
      setLoadingNotices(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchActiveNotices();
    }
  }, [autoFetch, fetchActiveNotices]);

  const resetNotices = useCallback(() => setActiveNotices([]), []);

  return {
    activeNotices,
    loadingNotices,
    fetchActiveNotices,
    resetNotices,
  };
};

export default useActiveNotices;