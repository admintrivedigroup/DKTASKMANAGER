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
      color: "text-indigo-600 bg-indigo-50",
      icon: LuClipboardList,
    },
    {
      label: "Pending Tasks",
      value: addThousandsSeparator(
        dashboardData?.charts?.taskDistribution?.Pending || 0
      ),
      color: "text-amber-600 bg-amber-50",
      icon: LuClock3,
    },
    {
      label: "In Progress",
      value: addThousandsSeparator(
        dashboardData?.charts?.taskDistribution?.InProgress || 0
      ),
      color: "text-sky-600 bg-sky-50",
      icon: LuRefreshCcw,
    },
    {
      label: "Completed Tasks",
      value: addThousandsSeparator(
        dashboardData?.charts?.taskDistribution?.Completed || 0
      ),
      color: "text-emerald-600 bg-emerald-50",
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
              <div className="card mb-6 animate-pulse bg-slate-50 text-sm text-slate-500">
                Loading announcements...
              </div>
            }
          >
            <NoticeBoard notices={activeNotices} />
          </Suspense>

          <section className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                {getGreetingMessage()}, {user?.name}
              </h1>
              <p className="mt-1 text-slate-500">
                {formattedTimestamp}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Momentum</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                Tick off tasks, celebrate the wins and keep the flow going.
              </p>
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

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="card">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h5 className="text-base font-semibold text-slate-900">Task Distribution</h5>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
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
                <div className="mt-4">
                  <CustomPieChart data={pieChartData} colors={COLORS} />
                </div>
              </Suspense>
            </div>

            <div className="card">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h5 className="text-base font-semibold text-slate-900">Task Priority Levels</h5>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
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
                <div className="mt-4">
                  <CustomBarChart data={barChartData} />
                </div>
              </Suspense>
            </div>
          </section>

          <section className="card mt-8">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h5 className="text-lg font-semibold text-slate-900">Recent Tasks</h5>
                <p className="text-sm text-slate-500">
                  Track status updates, collaborations and what needs your attention next.
                </p>
              </div>

              <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700" onClick={onSeeMore}>
                View All Tasks <LuArrowRight className="ml-1 inline text-base" />
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