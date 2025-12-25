import React, {
  lazy,
  Suspense,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { useUserAuth } from "../../hooks/useUserAuth.jsx";
import { UserContext } from "../../context/userContext.jsx";
import DashboardLayout from "../../components/layouts/DashboardLayout.jsx";
import PageHeader from "../../components/layouts/PageHeader.jsx";
import axiosInstance from "../../utils/axiosInstance.js";
import { API_PATHS } from "../../utils/apiPaths.js";
import { addThousandsSeparator } from "../../utils/helper.js";
import { DEFAULT_OFFICE_LOCATIONS } from "../../utils/data.js";
import {
  getPrivilegedBasePath,
  matchesRole,
  normalizeRole
} from "../../utils/roleUtils.js";
import InfoCard from "../../components/Cards/infoCard.jsx";
import {
  LuArrowRight,
  LuBadgeCheck,
  LuClipboardList,
  LuClock3,
  LuRefreshCcw
} from "react-icons/lu";
import LoadingOverlay from "../../components/LoadingOverlay.jsx";
import useActiveNotices from "../../hooks/useActiveNotices.js";
import {
  formatFullDateTime,
  formatDateLabel,
  formatDateInputValue
} from "../../utils/dateUtils.js";

const NoticeBoard = lazy(() => import("../../components/NoticeBoard.jsx"));
const CustomPieChart = lazy(() => import("../../components/Charts/CustomPieChart.jsx"));
const CustomBarChart = lazy(() => import("../../components/Charts/CustomBarChart.jsx"));
const TaskListTable = lazy(() => import("../../components/TaskListTable.jsx"));
const LeaderboardTable = lazy(() => import("../../components/LeaderboardTable.jsx"));

const getGreetingMessage = (hour) => {
  if (hour < 12) {
    return "Good Morning";
  }

  if (hour < 17) {
    return "Good Afternoon";
  }

  return "Good Evening";
};  

const LiveGreeting = React.memo(({ userName }) => {
  const [currentMoment, setCurrentMoment] = useState(() => new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentMoment(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const greetingMessage = useMemo(
    () => getGreetingMessage(currentMoment.getHours()),
    [currentMoment]
  );

  const formattedDate = useMemo(
    () => formatFullDateTime(currentMoment),
    [currentMoment]
  );

  return (
    <>
      <h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">
        {greetingMessage}, {userName}
      </h2>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{formattedDate}</p>
    </>
  );
});

const COLORS = ["#8D51FF", "#00B8DB", "#7BCE00"];

const normalizeDate = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const createRangeFromDates = (startDate, endDate) => ({
  startDate: formatDateInputValue(startDate),
  endDate: formatDateInputValue(endDate)
});

const createTodayRange = () => {
  const today = normalizeDate(new Date());
  return createRangeFromDates(today, today);
};

const createThisWeekRange = () => {
  const today = normalizeDate(new Date());
  const startOfWeek = new Date(today);
  const day = startOfWeek.getDay();
  const diffToMonday = (day + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

  return createRangeFromDates(startOfWeek, today);
};

const createLast7DaysRange = () => {
  const today = normalizeDate(new Date());
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 6);

  return createRangeFromDates(startDate, today);
};

const createLast30DaysRange = () => {
  const today = normalizeDate(new Date());
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 29);

  return createRangeFromDates(startDate, today);
};

const createThisMonthRange = () => {
  const today = normalizeDate(new Date());
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);

  return createRangeFromDates(startDate, today);
};

const createLastMonthRange = () => {
  const today = normalizeDate(new Date());
  const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endDate = new Date(today.getFullYear(), today.getMonth(), 0);

  return createRangeFromDates(startDate, endDate);
};

const createYearToDateRange = () => {
  const today = normalizeDate(new Date());
  const startDate = new Date(today.getFullYear(), 0, 1);

  return createRangeFromDates(startDate, today);
};

const PRESET_RANGES = [
  { label: "Today", rangeFactory: createTodayRange },
  { label: "This Week", rangeFactory: createThisWeekRange },
  { label: "Last 7 Days", rangeFactory: createLast7DaysRange },
  { label: "Last 30 Days", rangeFactory: createLast30DaysRange },
  { label: "This Month", rangeFactory: createThisMonthRange },
  { label: "Last Month", rangeFactory: createLastMonthRange },
  { label: "Year to Date", rangeFactory: createYearToDateRange }
];

const createDefaultDateRange = () => createLast30DaysRange();

const Dashboard = () => {
  useUserAuth();

  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [pieChartData, setPieChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboardFilter, setLeaderboardFilter] = useState("All");
  const [leaderboardOfficeFilter, setLeaderboardOfficeFilter] =
    useState("All");
  const [activeDateRange, setActiveDateRange] = useState(() =>
    createDefaultDateRange()
  );
  const [pendingDateRange, setPendingDateRange] = useState(() =>
    createDefaultDateRange()
  );    
  const { activeNotices, fetchActiveNotices, resetNotices } =
    useActiveNotices(false);

  const isRangeValid = useMemo(() => {
    if (!pendingDateRange.startDate || !pendingDateRange.endDate) {
      return false;
    }

    const start = new Date(pendingDateRange.startDate);
    const end = new Date(pendingDateRange.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return false;
    }

    return start.getTime() <= end.getTime();
  }, [pendingDateRange.endDate, pendingDateRange.startDate]);

  const showRangeError = useMemo(() => {
    if (!pendingDateRange.startDate || !pendingDateRange.endDate) {
      return false;
    }

    return !isRangeValid;
  }, [isRangeValid, pendingDateRange.endDate, pendingDateRange.startDate]);

  const activeRangeSummary = useMemo(() => {
    if (!activeDateRange.startDate || !activeDateRange.endDate) {
      return "No range selected";
    }

    const startLabel = formatDateLabel(activeDateRange.startDate);
    const endLabel = formatDateLabel(activeDateRange.endDate);

    if (startLabel === endLabel) {
      return startLabel;
    }

    return `${startLabel} → ${endLabel}`;
  }, [activeDateRange.endDate, activeDateRange.startDate]);

  const prepareChartData = useCallback((data) => {
    const taskDistribution = data?.taskDistribution || null;
    const taskPriorityLevels = data?.taskPriorityLevels || null;

    const taskDistributionData = [
      { status: "Pending", count: taskDistribution?.Pending || 0 },
      { status: "In Progress", count: taskDistribution?.InProgress || 0 },
      { status: "Completed", count: taskDistribution?.Completed || 0 }
    ];

    setPieChartData(taskDistributionData);

    const PriorityLevelData = [
      { priority: "Low", count: taskPriorityLevels?.Low || 0 },
      { priority: "Medium", count: taskPriorityLevels?.Medium || 0 },
      { priority: "High", count: taskPriorityLevels?.High || 0 }
    ];

    setBarChartData(PriorityLevelData);
  }, []);

  const getDashboardData = useCallback(async (range) => {
    try {
      const params = {};

      if (range?.startDate) {
        params.startDate = range.startDate;
      }

      if (range?.endDate) {
        params.endDate = range.endDate;
      }

      const response = await axiosInstance.get(
        API_PATHS.TASKS.GET_DASHBOARD_DATA,
        { params }
      );
      if (response.data) {
        setDashboardData(response.data);
        prepareChartData(response.data?.charts || null);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [prepareChartData]);

  const privilegedBasePath = useMemo(
    () => getPrivilegedBasePath(user?.role),
    [user?.role]
  );

  const handleLeaderboardEntryClick = useCallback(
    (entry) => {
      if (!entry?.userId) {
        return;
      }

      navigate(`${privilegedBasePath}/users/${entry.userId}`);
    },
    [navigate, privilegedBasePath]
  );

  const onSeeMore = () => {
    navigate(`${privilegedBasePath}/tasks`);
  };

  const fetchDashboard = useCallback(
    async (range) => {
      const effectiveRange = range || activeDateRange;

      try {
        setIsLoading(true);
        setDashboardData(null);
        setPieChartData([]);
        setBarChartData([]);
        resetNotices();

        setLeaderboardFilter("All");
        setLeaderboardOfficeFilter("All");
        await Promise.all([
          getDashboardData(effectiveRange),
          fetchActiveNotices()
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [activeDateRange, fetchActiveNotices, getDashboardData, resetNotices]
  );

  useEffect(() => {  
    fetchDashboard();

    return () => {
      resetNotices();
    };
  }, [fetchDashboard, resetNotices]);

  const handleDateInputChange = useCallback((key, value) => {
    setPendingDateRange((previous) => ({
      ...previous,
      [key]: value
    }));
  }, []);

  const applyDateRange = useCallback((range) => {
    setPendingDateRange(range);

    setActiveDateRange((previous) => {
      if (
        previous.startDate === range.startDate &&
        previous.endDate === range.endDate
      ) {
        return previous;
      }

      return range;
    });
  }, []);

  const handleDateFilterSubmit = useCallback(
    (event) => {
      event.preventDefault();

      if (!isRangeValid) {
        return;
      }

      applyDateRange({ ...pendingDateRange });
    },
    [applyDateRange, isRangeValid, pendingDateRange]
  );

  const handlePresetRange = useCallback(
    (rangeFactory) => {
      const presetRange = rangeFactory();
      applyDateRange(presetRange);
    },
    [applyDateRange]
  );

  const activePresetLabel = useMemo(() => {
    const foundPreset = PRESET_RANGES.find((preset) => {
      const presetRange = preset.rangeFactory();

      return (
        presetRange.startDate === activeDateRange.startDate &&
        presetRange.endDate === activeDateRange.endDate
      );
    });

    return foundPreset?.label || "";
  }, [activeDateRange.endDate, activeDateRange.startDate]);

  const totalNotices = Array.isArray(activeNotices) ? activeNotices.length : 0;

  const infoCards = useMemo(
    () => [
      {
        label: "Total Tasks",
        value: addThousandsSeparator(
          dashboardData?.charts?.taskDistribution?.All || 0
        ),
        color: "text-indigo-700 bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-100",
        icon: LuClipboardList,
        filterStatus: "All"
      },
      {
        label: "Pending Tasks",
        value: addThousandsSeparator(
          dashboardData?.charts?.taskDistribution?.Pending || 0
        ),
        color: "text-amber-700 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-100",
        icon: LuClock3,
        filterStatus: "Pending"
      },
      {
        label: "In Progress",
        value: addThousandsSeparator(
          dashboardData?.charts?.taskDistribution?.InProgress || 0
        ),
        color: "text-cyan-700 bg-cyan-50 dark:bg-cyan-500/15 dark:text-cyan-100",
        icon: LuRefreshCcw,
        filterStatus: "In Progress"
      },
      {
        label: "Completed Tasks",
        value: addThousandsSeparator(
          dashboardData?.charts?.taskDistribution?.Completed || 0
        ),
        color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-100",
        icon: LuBadgeCheck,
        filterStatus: "Completed"
      }
    ],
    [dashboardData?.charts?.taskDistribution]
  );

  const handleCardClick = (filterStatus) => {
    navigate(`${privilegedBasePath}/tasks`, { state: { filterStatus } });
  };

  const safeLeaderboardData = useMemo(() => {
    if (!Array.isArray(dashboardData?.leaderboard)) {
      return [];
    }

    const normalizedEntries = dashboardData.leaderboard
      .map((entry) => {
        const normalizedRole = normalizeRole(entry?.role);

        return {
          ...entry,
          role: typeof normalizedRole === "string" ? normalizedRole : ""
        };
      })
      .filter(
        (entry) =>
          matchesRole(entry.role, "admin") || matchesRole(entry.role, "member")
      );

    const sortedEntries = [...normalizedEntries].sort((a, b) => {
      if (a?.rank && b?.rank) {
        return a.rank - b.rank;
      }

      if (a?.rank) {
        return -1;
      }

      if (b?.rank) {
        return 1;
      }

      return Number(b?.score || 0) - Number(a?.score || 0);
    });

    return sortedEntries.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));    
  }, [dashboardData?.leaderboard]);

  const filteredLeaderboard = useMemo(() => {
    const normalizedRoleFilter =
      typeof leaderboardFilter === "string"
        ? leaderboardFilter.trim().toLowerCase()
        : "";
    const normalizedOfficeFilter =
      typeof leaderboardOfficeFilter === "string"
        ? leaderboardOfficeFilter.trim().toLowerCase()
        : "";

    return safeLeaderboardData.filter((entry) => {
      const matchesRoleFilter =
        normalizedRoleFilter === "all" || !normalizedRoleFilter
          ? true
          : normalizedRoleFilter === "admin"
          ? matchesRole(entry.role, "admin")
          : matchesRole(entry.role, "member");

      const entryOffice = (entry.officeLocation || "")
        .toString()
        .trim()
        .toLowerCase();          
      const matchesOffice =
        normalizedOfficeFilter === "all" || !normalizedOfficeFilter
          ? true
          : entryOffice === normalizedOfficeFilter;

      return matchesRoleFilter && matchesOffice;
    });
  }, [
    leaderboardFilter,
    leaderboardOfficeFilter,
    safeLeaderboardData
  ]);

  const visibleTopPerformer = filteredLeaderboard[0] || null;
  const topPerformerScore = useMemo(
    () =>
      visibleTopPerformer
        ? Number(visibleTopPerformer.score || 0).toLocaleString()
        : null,
    [visibleTopPerformer]
  );

  const leaderboardRoleFilters = ["All", "Admin", "Members"];
  const leaderboardOfficeFilters = useMemo(() => {
    const locationMap = new Map();

    DEFAULT_OFFICE_LOCATIONS.forEach((location) => {
      const trimmedLocation =
        typeof location === "string" ? location.trim() : "";

      if (!trimmedLocation) {
        return;
      }

      locationMap.set(trimmedLocation.toLowerCase(), trimmedLocation);
    });

    safeLeaderboardData.forEach((entry) => {
      const rawLocation =
        typeof entry?.officeLocation === "string"
          ? entry.officeLocation.trim()
          : "";

      if (!rawLocation) {
        return;
      }

      const normalizedLocation = rawLocation.toLowerCase();

      if (!locationMap.has(normalizedLocation)) {
        locationMap.set(normalizedLocation, rawLocation);
      }
    });

    const sortedLocations = Array.from(locationMap.values()).sort(
      (first, second) => first.localeCompare(second)
    );

    return ["All", ...sortedLocations];
  }, [safeLeaderboardData]);

  useEffect(() => {
    if (
      typeof leaderboardOfficeFilter === "string" &&
      leaderboardOfficeFilter &&
      !leaderboardOfficeFilters.includes(leaderboardOfficeFilter)
    ) {
      setLeaderboardOfficeFilter("All");
    }
  }, [leaderboardOfficeFilter, leaderboardOfficeFilters]);

  return (
    <DashboardLayout activeMenu="Dashboard">
     {isLoading ? (
        <LoadingOverlay message="Loading workspace overview..." className="py-24" />
      ) : (
        <div className="page-shell">
          <Suspense
            fallback={
              <div className="card mb-6 animate-pulse bg-white/60 text-sm text-slate-500 dark:bg-slate-900/60 dark:text-slate-300">
                Loading announcements...
              </div>
            }
          >
            <NoticeBoard notices={activeNotices} />
          </Suspense>

          <PageHeader
            tone="primary"
            eyebrow="Workspace Overview"
            title={<LiveGreeting userName={user?.name || "User"} />}
            description="Stay on top of execution, unblock teams quickly, and keep every deliverable moving with clear focus."
            meta={[
              `Range: ${activeRangeSummary}`,
              `Preset: ${activePresetLabel || "Custom"}`,
              `${totalNotices} active notice${totalNotices === 1 ? "" : "s"}`,
            ]}
            actions={
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/85">
                  Date range
                </p>
                <div className="flex flex-wrap gap-2 rounded-2xl border border-white/25 bg-white/10 p-2 shadow-inner shadow-indigo-900/25 dark:border-white/10 dark:bg-white/5 dark:shadow-indigo-950/30">
                  {PRESET_RANGES.map(({ label, rangeFactory }) => {
                    const isActive = label === activePresetLabel;
                    return (
                      <button
                        key={label}
                        onClick={() => handlePresetRange(rangeFactory)}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-white text-indigo-700 shadow-sm"
                            : "text-white/85 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <form
                  onSubmit={handleDateFilterSubmit}
                  className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
                >
                  <input
                    type="date"
                    value={pendingDateRange.startDate}
                    onChange={({ target }) =>
                      handleDateInputChange("startDate", target.value)
                    }
                    className="w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm text-white placeholder-white/70 outline-none transition focus:border-white focus:ring-2 focus:ring-white/50 dark:border-white/20 dark:bg-white/10 dark:text-white/90 dark:focus:border-white/70 dark:focus:ring-white/30 sm:w-auto"
                  />
                  <span className="text-white/80 sm:mx-1">→</span>
                  <input
                    type="date"
                    value={pendingDateRange.endDate}
                    onChange={({ target }) =>
                      handleDateInputChange("endDate", target.value)
                    }
                    className="w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm text-white placeholder-white/70 outline-none transition focus:border-white focus:ring-2 focus:ring-white/50 dark:border-white/20 dark:bg-white/10 dark:text-white/90 dark:focus:border-white/70 dark:focus:ring-white/30 sm:w-auto"
                  />
                  <button
                    type="submit"
                    disabled={!isRangeValid}
                    className="inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm shadow-indigo-900/20 transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-60 dark:bg-white/85 dark:text-indigo-800 dark:hover:bg-white"
                  >
                    Apply Range
                  </button>
                </form>

                {showRangeError ? (
                  <p className="text-xs font-medium text-rose-100">
                    Start date must be on or before the end date.
                  </p>
                ) : null}
              </div>
            }
          />

          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:gap-8">
            {infoCards.map((card) => (
              <InfoCard
                key={card.label}
                label={card.label}
                value={card.value}
                color={card.color}
                icon={card.icon}
                onClick={() => handleCardClick(card.filterStatus)}
              />
            ))}
          </section>

          <section className="grid gap-8 lg:grid-cols-2">
            <div className="card">
              <div className="flex items-center justify-between pb-3">
                <h5 className="text-base font-semibold text-slate-900 dark:text-slate-100">Task Distribution</h5>
                <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700">
                  Overview
                </span>
              </div>

              <Suspense
                fallback={
                  <div className="flex h-[325px] items-center justify-center text-sm text-slate-500 dark:text-slate-300">
                    Loading chart data...
                  </div>
                }
              >
                <CustomPieChart data={pieChartData} colors={COLORS} />
              </Suspense>
            </div>

            <div className="card">
              <div className="flex items-center justify-between pb-3">
                <h5 className="text-base font-semibold text-slate-900 dark:text-slate-100">Task Priority Levels</h5>
                <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700">
                  Priority Mix
                </span>
              </div>

              <Suspense
                fallback={
                  <div className="flex h-[325px] items-center justify-center text-sm text-slate-500 dark:text-slate-300">
                    Loading chart data...
                  </div>
                }
              >
                <CustomBarChart data={barChartData} />
              </Suspense>
            </div>
          </section>

          <section className="card">
            <div className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h5 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Tasks</h5>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Monitor the latest updates across the workspace at a glance.
                </p>
              </div>

              <button className="card-btn" onClick={onSeeMore}>
                See All <LuArrowRight className="text-base" />
              </button>
            </div>

            <Suspense
              fallback={
                <div className="flex h-32 items-center justify-center text-sm text-slate-500 dark:text-slate-300">
                  Loading recent tasks...
                </div>
              }
            >
              <TaskListTable
                tableData={(dashboardData?.recentTasks || []).slice(0, 5)}
              />
            </Suspense>
          </section>
          
          <section className="card">
            <div className="flex flex-col gap-4 pb-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                  <h5 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Employee Leaderboard
                </h5>
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                  Celebrate on-time delivery and shine a light on the most reliable teammates.
                </p>
                {visibleTopPerformer ? (
                  <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-800/60 dark:text-slate-200">
                    Top Performer · {visibleTopPerformer.name} · Score {topPerformerScore}
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Leaderboard updates once work is completed.
                  </p>
                )}
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-end sm:gap-4">
                <div className="flex w-full flex-col sm:w-auto">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400"
                    htmlFor="leaderboard-role-filter"
                  >
                    Team Role
                  </label>
                  <div className="custom-select mt-2 min-w-[180px] sm:min-w-[200px]">
                    <select
                      id="leaderboard-role-filter"
                      value={leaderboardFilter}
                      onChange={(event) => setLeaderboardFilter(event.target.value)}
                      className="custom-select__field"
                    >
                      {leaderboardRoleFilters.map((filter) => (
                        <option key={filter} value={filter}>
                          {filter}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex w-full flex-col sm:w-auto">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400"
                    htmlFor="leaderboard-office-filter"
                  >
                    Office
                  </label>
                  <div className="custom-select mt-2 min-w-[180px] sm:min-w-[200px]">
                    <select
                      id="leaderboard-office-filter"
                      value={leaderboardOfficeFilter}
                      onChange={(event) =>
                        setLeaderboardOfficeFilter(event.target.value)
                      }
                      className="custom-select__field"
                    >
                      {leaderboardOfficeFilters.map((filter) => (
                        <option key={filter} value={filter}>
                          {filter}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <Suspense
              fallback={
                <div className="flex h-40 items-center justify-center text-sm text-slate-500 dark:text-slate-300">
                  Loading leaderboard...
                </div>
              }
            >
              <LeaderboardTable
                entries={filteredLeaderboard}
                onEntryClick={handleLeaderboardEntryClick}
              />
            </Suspense>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
