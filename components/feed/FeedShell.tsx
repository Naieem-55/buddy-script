"use client";

import { useTheme } from "@/components/theme";
import type { CurrentUser, FeedPage } from "@/lib/types";
import ThemeToggle from "./ThemeToggle";
import Navbar from "./Navbar";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import FeedColumn from "./FeedColumn";

export default function FeedShell({
  user,
  initialFeed,
}: {
  user: CurrentUser;
  initialFeed: FeedPage;
}) {
  const { dark } = useTheme();
  return (
    <div className={`_layout _layout_main_wrapper${dark ? " _dark_wrapper" : ""}`}>
      <ThemeToggle />
      <div className="_main_layout">
        <Navbar user={user} />
        <div className="container _custom_container">
          <div className="_layout_inner_wrap">
            <div className="row">
              <LeftSidebar />
              <FeedColumn user={user} initialFeed={initialFeed} />
              <RightSidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
