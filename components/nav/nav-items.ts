import {
  Home,
  MessagesSquare,
  Menu,
  LayoutDashboard,
  ListTodo,
  Mail,
  BookOpen,
  Users,
  Trees,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/email-assistant", label: "Email", icon: Mail },
  { href: "/groups", label: "Retreats", icon: Trees },
  { href: "/knowledge-base", label: "Knowledge", icon: BookOpen },
  { href: "/people", label: "People", icon: Users },
];

// The phone's bottom bar, as in the chat mockups: the rest lives under More.
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/chat", label: "Chat", icon: MessagesSquare },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/email-assistant", label: "Email", icon: Mail },
  { href: "/more", label: "More", icon: Menu },
];
