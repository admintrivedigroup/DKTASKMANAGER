import {
  LuClipboardCheck,
  LuFileStack,
  LuFolderTree,
  LuLayoutDashboard,
  LuReceipt,
  LuUsers,
  LuUserCheck,
  LuHouse, 
} from "react-icons/lu";

export const SIDE_MENU_DATA = [
  {
    id: "01",
    label: "Dashboard",
    icon: LuLayoutDashboard,
    path: "/admin/dashboard",
  },
  {
    id: "02",
    label: "Tasks",
    icon: LuClipboardCheck,
    path: "/admin/tasks",
  },
  {
    id: "03",  
    label: "Matters",
    icon: LuFolderTree,
    path: "/admin/matters",
  },
  {
    id: "04",
    label: "Invoices",
    icon: LuReceipt,
    path: "/admin/invoices",
  },
  {
    id: "05",    
    label: "Employees",
    icon: LuUsers,
    path: "/admin/employees",
  },
  {
    id: "06",
    label: "Clients",
    icon: LuUserCheck,
    path: "/admin/clients",
  },
  {
    id: "07",    
    label: "Documents",
    icon: LuFileStack,
    path: "/admin/documents",
  },  
];

export const SIDE_MENU_USER_DATA = [
  {
    id: "01",
    label: "Dashboard",
    icon: LuLayoutDashboard,
    path: "/user/dashboard",
  },
  {
    id: "02",
    label: "My Tasks",
    icon: LuClipboardCheck,
    path: "/user/tasks",
  },
  {
    id: "03",  
    label: "Matters",
    icon: LuFolderTree,
    path: "/user/matters",
  },
  {
    id: "04",
    label: "Documents",
    icon: LuFileStack,
    path: "/user/documents",
  },  
];

export const SIDE_MENU_CLIENT_DATA = [
  {
    id: "01",
    label: "Home",
    icon: LuHouse,
    path: "/client/home",
  },
  {
    id: "02",
    label: "Invoices",
    icon: LuReceipt,
    path: "/client/invoices",
  },  
];

export const PRIORITY_DATA = [
  { label: "Low", value: "Low" },
  { label: "Medium", value: "Medium" },
  { label: "High", value: "High" },
];

export const STATUS_DATA = [
  { label: "Pending", value: "Pending" },
  { label: "In Progress", value: "In Progress" },
  { label: "Completed", value: "Completed" },
];

export const DEFAULT_OFFICE_LOCATIONS = ["Ahmedabad", "Gift City"];