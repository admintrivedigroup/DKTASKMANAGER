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
import { useUserAuth } from "../../hooks/useUserAuth";
import { UserContext } from "../../context/userContext.jsx";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { addThousandsSeparator } from "../../utils/helper";
import { DEFAULT_OFFICE_LOCATIONS } from "../../utils/data";
import {
  getPrivilegedBasePath,
  matchesRole,
  normalizeRole
} from "../../utils/roleUtils";
import InfoCard from "../../components/Cards/infoCard";
import {
  LuArrowRight,
  LuBadgeCheck,
  LuClipboardList,
  LuClock3,
  LuRefreshCcw
} from "react-icons/lu";
import LoadingOverlay from "../../components/LoadingOverlay";
import useActiveNotices from "../../hooks/useActiveNotices";
import {
  formatFullDateTime,
  formatDateLabel,
  formatDateInputValue
} from "../../utils/dateUtils";

const NoticeBoard = lazy(() => import("../../components/NoticeBoard"));
const CustomPieChart = lazy(() => import("../../components/Charts/CustomPieChart"));
const CustomBarChart = lazy(() => import("../../components/Charts/CustomBarChart"));
const TaskListTable = lazy(() => import("../../components/TaskListTable"));
const LeaderboardTable = lazy(() => import("../../components/LeaderboardTable"));

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
      <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
        {greetingMessage}, {userName}
      </h2>
      <p className="mt-3 text-sm text-white/70">{formattedDate}</p>
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

  const activeRangeLabel = useMemo(() => {
    if (!activeDateRange.startDate || !activeDateRange.endDate) {
      return "";
    }

    const startLabel = formatDateLabel(activeDateRange.startDate, "");
    const endLabel = formatDateLabel(activeDateRange.endDate, "");

    if (!startLabel || !endLabel) {
      return "";
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

  const infoCards = useMemo(
    () => [
      {
        label: "Total Tasks",
        value: addThousandsSeparator(
          dashboardData?.charts?.taskDistribution?.All || 0
        ),
        color: "from-primary via-indigo-500 to-sky-400",
        icon: LuClipboardList,
        filterStatus: "All"
      },
      {
        label: "Pending Tasks",
        value: addThousandsSeparator(
          dashboardData?.charts?.taskDistribution?.Pending || 0
        ),
        color: "from-amber-400 via-orange-500 to-red-400",
        icon: LuClock3,
        filterStatus: "Pending"
      },
      {
        label: "In Progress",
        value: addThousandsSeparator(
          dashboardData?.charts?.taskDistribution?.InProgress || 0
        ),
        color: "from-sky-400 via-cyan-500 to-emerald-400",
        icon: LuRefreshCcw,
        filterStatus: "In Progress"
      },
      {
        label: "Completed Tasks",
        value: addThousandsSeparator(
          dashboardData?.charts?.taskDistribution?.Completed || 0
        ),
        color: "from-emerald-400 via-lime-400 to-green-500",
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
        <>
          <Suspense
            fallback={
              <div className="card mb-6 animate-pulse bg-white/60 text-sm text-slate-500">
                Loading announcements...
              </div>
            }
          >
            <NoticeBoard notices={activeNotices} />
          </Suspense>

          <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-primary via-indigo-500 to-sky-500 px-4 py-8 text-white shadow-[0_20px_45px_rgba(59,130,246,0.25)] sm:px-6 sm:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.2),_transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.18),_transparent_60%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 text-sm lg:max-w-[420px] lg:flex-1">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.42em] text-white/70">Welcome Back</p>
                  <LiveGreeting userName={user?.name || "User"} />
                </div>
              </div>

               <div className="w-full rounded-3xl border border-white/40 bg-white/10 px-5 py-3 text-sm backdrop-blur-sm sm:px-7 lg:w-[500px]">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                    Date Range
                  </p>
                  {activeRangeLabel ? (
                    <p className="text-sm font-medium text-white/80">
                      {activeRangeLabel}
                    </p>
                  ) : null}
                </div>

                <form
                  className="mt-3 space-y-2"
                  onSubmit={handleDateFilterSubmit}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-white/70">
                      <span className="uppercase tracking-[0.18em]">From</span>
                      <input
                        type="date"
                        value={pendingDateRange.startDate}
                        onChange={({ target }) =>
                          handleDateInputChange("startDate", target.value)
                        }
                        className="w-full rounded-xl border border-white/30 bg-white/90 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-white focus:ring-2 focus:ring-white/70"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-white/70">
                      <span className="uppercase tracking-[0.18em]">To</span>
                      <input
                        type="date"
                        value={pendingDateRange.endDate}
                        onChange={({ target }) =>
                          handleDateInputChange("endDate", target.value)
                        }
                        className="w-full rounded-xl border border-white/30 bg-white/90 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-white focus:ring-2 focus:ring-white/70"
                      />
                    </label>
                  </div>

                  {showRangeError ? (
                    <p className="text-xs font-medium text-rose-100">
                      Start date must be on or before the end date.
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={!isRangeValid}
                      className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/50 disabled:text-white/70"
                    >
                      Apply
                    </button>
                    {PRESET_RANGES.map(({ label, rangeFactory }) => {
                      const isActive = label === activePresetLabel;

                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handlePresetRange(rangeFactory)}
                          className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                            isActive
                              ? "border-white bg-white text-primary shadow"
                              : "border-white/40 bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </form>
                </div>
              </div>
          </section>{/* ✅ Close the gradient hero section */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <div className="flex items-center justify-between">
                <h5 className="text-base font-semibold text-slate-900">Task Distribution</h5>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                  Overview
                </span>
              </div>

              <Suspense
                fallback={
                  <div className="flex h-[325px] items-center justify-center text-sm text-slate-500">
                    Loading chart data...
                  </div>
                }
              >
                <CustomPieChart data={pieChartData} colors={COLORS} />
              </Suspense>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <h5 className="text-base font-semibold text-slate-900">Task Priority Levels</h5>
                <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                  Priority Mix
                </span>
              </div>

              <Suspense
                fallback={
                  <div className="flex h-[325px] items-center justify-center text-sm text-slate-500">
                    Loading chart data...
                  </div>
                }
              >
                <CustomBarChart data={barChartData} />
              </Suspense>
            </div>
          </section>

          <section className="card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h5 className="text-lg font-semibold text-slate-900">Recent Tasks</h5>
                <p className="text-sm text-slate-500">
                  Monitor the latest updates across the workspace at a glance.
                </p>
              </div>

              <button className="card-btn" onClick={onSeeMore}>
                See All <LuArrowRight className="text-base" />
              </button>
            </div>

            <Suspense
              fallback={
                <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                  Loading recent tasks...
                </div>
              }
            >
              <TaskListTable tableData={dashboardData?.recentTasks || []} />
            </Suspense>
          </section>
          
          <section className="card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h5 className="text-lg font-semibold text-slate-900">
                  Employee Leaderboard
                </h5>
                <p className="text-sm text-slate-500">
                  Celebrate on-time delivery and shine a light on the most reliable teammates.
                </p>
                {visibleTopPerformer ? (
                  <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                    Top Performer · {visibleTopPerformer.name} · Score {topPerformerScore}
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    Leaderboard updates once work is completed.
                  </p>
                )}
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-end sm:gap-4">
                <div className="flex w-full flex-col sm:w-auto">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500"
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
                    className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500"
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
                <div className="flex h-40 items-center justify-center text-sm text-slate-500">
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
        </>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
