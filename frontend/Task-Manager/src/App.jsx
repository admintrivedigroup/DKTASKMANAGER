import React, { Suspense, useContext, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import PrivateRoute from "./routes/PrivateRoute";

import UserProvider, { UserContext } from "./context/userContext.jsx";
import LayoutProvider from "./context/layoutContext.jsx";
import { Toaster } from "react-hot-toast";
import { getDefaultRouteForRole } from "./utils/roleUtils";
import LoadingOverlay from "./components/LoadingOverlay";
const AdminDashboard = React.lazy(() => import("./pages/Admin/Dashboard"));
const Login = React.lazy(() => import("./pages/Auth/Login"));
const AdminTasks = React.lazy(() => import("./pages/Admin/Tasks"));
const AdminManageEmployees = React.lazy(() => import("./pages/Admin/ManageEmployees"));
const AdminManageClients = React.lazy(() => import("./pages/Admin/ManageClients"));
const AdminUserDetails = React.lazy(() => import("./pages/Admin/UserDetails"));
const AdminDocuments = React.lazy(() => import("./pages/Admin/Documents"));
const ProfileSettings = React.lazy(() => import("./pages/Profile/ProfileSettings"));
const SignUp = React.lazy(() => import("./pages/Auth/SignUp"));
const Unauthorized = React.lazy(() => import("./pages/Errors/Unauthorized"));
const UserDashboard = React.lazy(() => import("./pages/User/UserDashboard"));
const MyTasks = React.lazy(() => import("./pages/User/MyTasks"));
const ViewTaskDetails = React.lazy(() => import("./pages/User/ViewTaskDetails"));
const UserDocuments = React.lazy(() => import("./pages/User/Documents"));
const SuperAdminDashboard = React.lazy(() => import("./pages/SuperAdmin/Dashboard.jsx"));
const SuperAdminTasks = React.lazy(() => import("./pages/SuperAdmin/Tasks.jsx"));
const SuperAdminManageEmployees = React.lazy(() => import("./pages/SuperAdmin/ManageEmployees.jsx"));
const SuperAdminManageClients = React.lazy(() => import("./pages/SuperAdmin/ManageClients.jsx"));
const SuperAdminUserDetails = React.lazy(() => import("./pages/SuperAdmin/UserDetails.jsx"));
const SuperAdminDocuments = React.lazy(() => import("./pages/SuperAdmin/Documents.jsx"));
const ClientHome = React.lazy(() => import("./pages/Client/Home"));
const ClientProjects = React.lazy(() => import("./pages/Client/ClientProjects"));
const ClientViewTaskDetails = React.lazy(() => import("./pages/Client/ViewTaskDetails"));
const NotificationCenter = React.lazy(() =>
  import("./pages/Notifications/NotificationCenter.jsx")
);

const App = () => {
  return (
    <UserProvider>
      <LayoutProvider>
        <div>
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-600">
                Loading workspace...
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signUp" element={<SignUp />} />
              {/* Admin Routes */}
              <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/tasks" element={<AdminTasks />} />
                <Route
                  path="/admin/task-details/:id"
                  element={<ViewTaskDetails activeMenu="Tasks" />}
                />                
                <Route path="/admin/documents/*" element={<AdminDocuments />} />
                <Route path="/admin/employees" element={<AdminManageEmployees />} />
                <Route path="/admin/clients" element={<AdminManageClients />} />
                <Route path="/admin/users/:userId" element={<AdminUserDetails />} />
                <Route path="/admin/profile-settings" element={<ProfileSettings />} />
              </Route>

              {/* Super Admin Routes */}
              <Route element={<PrivateRoute allowedRoles={["super_admin"]} />}>
                <Route
                  path="/super-admin/dashboard"
                  element={<SuperAdminDashboard />}
                />
                <Route path="/super-admin/tasks" element={<SuperAdminTasks />} />
                <Route
                  path="/super-admin/task-details/:id"
                  element={<ViewTaskDetails activeMenu="Tasks" />}
                />                
                <Route
                  path="/super-admin/documents/*"
                  element={<SuperAdminDocuments />}
                />
                <Route
                  path="/super-admin/employees"
                  element={<SuperAdminManageEmployees />}
                />
                <Route
                  path="/super-admin/clients"
                  element={<SuperAdminManageClients />}
                />
                <Route
                  path="/super-admin/users/:userId"
                  element={<SuperAdminUserDetails />}
                />
                <Route
                  path="/super-admin/profile-settings"
                  element={<ProfileSettings />}
                />
              </Route>

              {/* Member Routes */}
              <Route element={<PrivateRoute allowedRoles={["member", "user"]} />}>
                <Route path="/user/dashboard" element={<UserDashboard />} />
                <Route path="/user/tasks" element={<MyTasks />} />
                <Route path="/user/task-details/:id" element={<ViewTaskDetails />} />
                <Route path="/user/documents/*" element={<UserDocuments />} />
                <Route path="/user/profile-settings" element={<ProfileSettings />} />
              </Route>

              {/* Client Routes */}
              <Route element={<PrivateRoute allowedRoles={["client"]} />}>
                <Route path="/client">
                  <Route index element={<Navigate to="home" replace />} />
                  <Route path="home" element={<ClientHome />} />
                  <Route path="projects" element={<ClientProjects />} />
                  <Route path="task-details/:id" element={<ClientViewTaskDetails />} />
                  <Route path="profile-settings" element={<ProfileSettings />} />
                </Route>
              </Route>

              <Route element={<PrivateRoute />}>
                <Route path="/notifications" element={<NotificationCenter />} />
              </Route>

              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="*" element={<RootRedirect />} />
          </Routes>
        </Suspense>
      </div>

        <Toaster
          toastOptions={{
            className: "",
            style: {
              fontSize: "13px",
            },
          }}
        />
      </LayoutProvider>
    </UserProvider>
  );
};


export default App;

const RootRedirect = () => {
  const { user, loading } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    const destination = getDefaultRouteForRole(user.role) || "/login";
    navigate(destination, { replace: true });
  }, [loading, navigate, user]);  

  if (loading) {
    return <LoadingOverlay fullScreen message="Preparing your workspace..." />;
  }

  const redirectMessage = user
    ? "Redirecting you to your workspace..."
    : "Redirecting you to the login page...";

  return <LoadingOverlay fullScreen message={redirectMessage} />;
};