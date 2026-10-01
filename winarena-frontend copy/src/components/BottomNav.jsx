import {
  Home,
  Gamepad2,
  Trophy,
  Wallet,
  User
} from "lucide-react";

import { NavLink } from "react-router-dom";

const items = [
  {
    name: "Home",
    icon: Home,
    path: "/"
  },
  {
    name: "Games",
    icon: Gamepad2,
    path: "/games"
  },
  {
    name: "Tournaments",
    icon: Trophy,
    path: "/tournaments"
  },
  {
    name: "Wallet",
    icon: Wallet,
    path: "/wallet"
  },
  {
    name: "Profile",
    icon: User,
    path: "/profile"
  }
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">

      {items.map((item) => {

        const Icon = item.icon;

        return (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              isActive
                ? "bottom-item active"
                : "bottom-item"
            }
          >
            <Icon size={21} />
            <span>{item.name}</span>
          </NavLink>
        );

      })}

    </nav>
  );
}