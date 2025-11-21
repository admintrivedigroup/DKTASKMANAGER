import React, {
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useUserAuth } from "../../hooks/useUserAuth";
import { UserContext } from "../../context/userContext.jsx";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { addThousandsSeparator, getGreetingMessage } from "../../utils/helper";
import InfoCard from "../../components/Cards/infoCard";
import { LuArrowRight, LuBadgeCheck, LuClipboardList, LuClock3, LuRefreshCcw } from "react-icons/lu";
import LoadingOverlay from "../../components/LoadingOverlay";
import useActiveNotices from "../../hooks/useActiveNotices";
import { formatFullDateTime } from "../../utils/dateUtils";

const NoticeBoard = lazy(() => import("../../components/NoticeBoard"));
const CustomPieChart = lazy(() => import("../../components/Charts/CustomPieChart"));
const CustomBarChart = lazy(() => import("../../components/Charts/CustomBarChart"));
const TaskListTable = lazy(() => import("../../components/TaskListTable"));

const COLORS = ["#8D51FF", "#00B8DB", "#7BCE00"];

const UserDashboard = () => {
  useUserAuth();

  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [pieChartData, setPieChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const { activeNotices, fetchActiveNotices, resetNotices } =
    useActiveNotices(false);  

  const prepareChartData = useCallback((data) => {
    const taskDistribution = data?.taskDistribution || null;
    const taskPriorityLevels = data?.taskPriorityLevels || null;

    const taskDistributionData = [
      { status: "Pending", count: taskDistribution?.Pending || 0 },
      { status: "In Progress", count: taskDistribution?.InProgress || 0 },
      { status: "Completed", count: taskDistribution?.Completed || 0 },
    ];

    setPieChartData(taskDistributionData);

    const priorityLevelData = [
      { priority: "Low", count: taskPriorityLevels?.Low || 0 },
      { priority: "Medium", count: taskPriorityLevels?.Medium || 0 },
      { priority: "High", count: taskPriorityLevels?.High || 0 },
    ];

    setBarChartData(priorityLevelData);
  }, []);

  const getDashboardData = useCallback(async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.TASKS.GET_USER_DASHBOARD_DATA
      );
      if (response.data) {
        setDashboardData(response.data);
        prepareChartData(response.data?.charts || null);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [prepareChartData]);

  const onSeeMore = () => {
    navigate("/user/tasks");
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        setDashboardData(null);
        setPieChartData([]);
        setBarChartData([]);
        resetNotices();

        await Promise.all([getDashboardData(), fetchActiveNotices()]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();

    return () => {};
  }, [fetchActiveNotices, getDashboardData, resetNotices, user?._id]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const formattedTimestamp = useMemo(
    () => formatFullDateTime(currentTime),
    [currentTime]
  );

  const infoCards = [
    {
      label: "Total Tasks",
      value: addThousandsSeparator(
        dashboardData?.charts?.taskDistribution?.All || 0
      ),
      color: "from-primary via-indigo-500 to-sky-400",
      icon: LuClipboardList,
    },
    {
      label: "Pending Tasks",
      value: addThousandsSeparator(
        dashboardData?.charts?.taskDistribution?.Pending || 0
      ),
      color: "from-amber-400 via-orange-500 to-red-400",
      icon: LuClock3,
    },
    {
      label: "In Progress",
      value: addThousandsSeparator(
        dashboardData?.charts?.taskDistribution?.InProgress || 0
      ),
      color: "from-sky-400 via-cyan-500 to-emerald-400",
      icon: LuRefreshCcw,
    },
    {
      label: "Completed Tasks",
      value: addThousandsSeparator(
        dashboardData?.charts?.taskDistribution?.Completed || 0
      ),
      color: "from-emerald-400 via-lime-400 to-green-500",
      icon: LuBadgeCheck,
    },
  ];

  return (
    <DashboardLayout activeMenu="Dashboard">
     {isLoading ? (
        <LoadingOverlay message="Loading your dashboard..." className="py-24" />
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

          <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-slate-900 via-indigo-700 to-sky-600 px-4 py-8 text-white shadow-[0_20px_45px_rgba(30,64,175,0.35)] sm:px-6 sm:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.22),_transparent_60%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.42em] text-white/60">Hello</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                  {getGreetingMessage()}, {user?.name}
                </h2>
                <p className="mt-3 text-sm text-white/70">{formattedTimestamp}</p>
              </div>

              <div className="rounded-3xl border border-white/40 bg-white/15 px-4 py-4 text-sm backdrop-blur sm:px-6">
                <p className="text-xs uppercase tracking-[0.28em] text-white/70">Momentum</p>
                <p className="mt-2 text-base font-medium">
                  Tick off tasks, celebrate the wins and keep the flow going.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {infoCards.map((card) => (
              <InfoCard
                key={card.label}
                label={card.label}
                value={card.value}
                color={card.color}
                icon={card.icon}
              />
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <div className="flex items-center justify-between">
                <h5 className="text-base font-semibold text-slate-900">Task Distribution</h5>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                  Progress Mix
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
                  Priorities
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
                  Track status updates, collaborations and what needs your attention next.
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
        </>
      )}
    </DashboardLayout>
  );
};

export default UserDashboard;