import type { ForwardRefExoticComponent, RefAttributes } from "react";
import AlarmClockPlusIconComponent from "@/components/liquid-icons/animated/hover-intent/alarm-clock-plus-icon";
import BookIconComponent from "@/components/liquid-icons/animated/hover-intent/book-icon";
import BookmarkIconComponent from "@/components/liquid-icons/animated/hover-intent/bookmark-icon";
import BrainCircuitIconComponent from "@/components/liquid-icons/animated/hover-intent/brain-circuit-icon";
import BulbSvgComponent from "@/components/liquid-icons/animated/hover-intent/bulb-svg";
import ChartHistogramIconComponent from "@/components/liquid-icons/animated/hover-intent/chart-histogram-icon";
import ChartLineIconComponent from "@/components/liquid-icons/animated/hover-intent/chart-line-icon";
import CheckedIconComponent from "@/components/liquid-icons/animated/hover-intent/checked-icon";
import ClockIconComponent from "@/components/liquid-icons/animated/hover-intent/clock-icon";
import Cloud3IconComponent from "@/components/liquid-icons/animated/hover-intent/cloud-3-icon";
import CodeIconComponent from "@/components/liquid-icons/animated/hover-intent/code-icon";
import CopyIconComponent from "@/components/liquid-icons/animated/hover-intent/copy-icon";
import CpuIconComponent from "@/components/liquid-icons/animated/hover-intent/cpu-icon";
import DoubleCheckIconComponent from "@/components/liquid-icons/animated/hover-intent/double-check-icon";
import FileDescriptionIconComponent from "@/components/liquid-icons/animated/hover-intent/file-description-icon";
import GaugeIconComponent from "@/components/liquid-icons/animated/hover-intent/gauge-icon";
import GearIconComponent from "@/components/liquid-icons/animated/hover-intent/gear-icon";
import GlobeIconComponent from "@/components/liquid-icons/animated/hover-intent/globe-icon";
import HandHeartIconComponent from "@/components/liquid-icons/animated/hover-intent/hand-heart-icon";
import HeartIconComponent from "@/components/liquid-icons/animated/hover-intent/heart-icon";
import HistoryCircleIconComponent from "@/components/liquid-icons/animated/hover-intent/history-circle-icon";
import HomeIconComponent from "@/components/liquid-icons/animated/hover-intent/home-icon";
import LayersIconComponent from "@/components/liquid-icons/animated/hover-intent/layers-icon";
import LayoutDashboardIconComponent from "@/components/liquid-icons/animated/hover-intent/layout-dashboard-icon";
import LetterJIconComponent from "@/components/liquid-icons/animated/hover-intent/letter-j-icon";
import LetterLIconComponent from "@/components/liquid-icons/animated/hover-intent/letter-l-icon";
import LibraryIconComponent from "@/components/liquid-icons/animated/hover-intent/library-icon";
import LockIconComponent from "@/components/liquid-icons/animated/hover-intent/lock-icon";
import MapPinIconComponent from "@/components/liquid-icons/animated/hover-intent/map-pin-icon";
import MessageCircleIconComponent from "@/components/liquid-icons/animated/hover-intent/message-circle-icon";
import PassportIconComponent from "@/components/liquid-icons/animated/hover-intent/passport-icon";
import PenIconComponent from "@/components/liquid-icons/animated/hover-intent/pen-icon";
import RadioIconComponent from "@/components/liquid-icons/animated/hover-intent/radio-icon";
import RainbowIconComponent from "@/components/liquid-icons/animated/hover-intent/rainbow-icon";
import RefreshIconComponent from "@/components/liquid-icons/animated/hover-intent/refresh-icon";
import RocketIconComponent from "@/components/liquid-icons/animated/hover-intent/rocket-icon";
import RosetteDiscountCheckIconComponent from "@/components/liquid-icons/animated/hover-intent/rosette-discount-check-icon";
import ScanHeartIconComponent from "@/components/liquid-icons/animated/hover-intent/scan-heart-icon";
import SparklesIconComponent from "@/components/liquid-icons/animated/hover-intent/sparkles-icon";
import Stack3IconComponent from "@/components/liquid-icons/animated/hover-intent/stack-3-icon";
import StackIconComponent from "@/components/liquid-icons/animated/hover-intent/stack-icon";
import TargetIconComponent from "@/components/liquid-icons/animated/hover-intent/target-icon";
import TerminalIconComponent from "@/components/liquid-icons/animated/hover-intent/terminal-icon";
import TravelBagComponent from "@/components/liquid-icons/animated/hover-intent/travel-bag";
import TrophyIconComponent from "@/components/liquid-icons/animated/hover-intent/trophy-icon";
import UserCheckIconComponent from "@/components/liquid-icons/animated/hover-intent/user-check-icon";
import UserIconComponent from "@/components/liquid-icons/animated/hover-intent/user-icon";
import UsersGroupIconComponent from "@/components/liquid-icons/animated/hover-intent/users-group-icon";
import UsersIconComponent from "@/components/liquid-icons/animated/hover-intent/users-icon";
import WalletIconComponent from "@/components/liquid-icons/animated/hover-intent/wallet-icon";

export type ItshoverAnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

type ItshoverAnimatedIconComponent = ForwardRefExoticComponent<
  Record<string, unknown> & RefAttributes<ItshoverAnimatedIconHandle>
>;

export const ITSHOVER_ICON_COMPONENTS = {
  "about-me": UserCheckIconComponent,
  "ai-knowledge": CpuIconComponent,
  "analytics": ChartHistogramIconComponent,
  "assets": Stack3IconComponent,
  "brain": BrainCircuitIconComponent,
  "bucket-list": RosetteDiscountCheckIconComponent,
  "calendar": ClockIconComponent,
  "career": GaugeIconComponent,
  "career-analytics": ChartLineIconComponent,
  "career-coach": MessageCircleIconComponent,
  "career-compass": MapPinIconComponent,
  "career-journal": FileDescriptionIconComponent,
  "career-network": GlobeIconComponent,
  "career-pipeline": LayersIconComponent,
  "career-profile": PassportIconComponent,
  "career-timeline": HistoryCircleIconComponent,
  "career-vault": LockIconComponent,
  "category-career": TravelBagComponent,
  "category-command-center": LayoutDashboardIconComponent,
  "category-goals-execution": RocketIconComponent,
  "category-knowledge": LibraryIconComponent,
  "category-learning": LetterLIconComponent,
  "category-people": UsersGroupIconComponent,
  "category-resources": StackIconComponent,
  "category-self": UserIconComponent,
  "daily-planner": AlarmClockPlusIconComponent,
  "dashboard": HomeIconComponent,
  "documents": CopyIconComponent,
  "finance": WalletIconComponent,
  "garden": RainbowIconComponent,
  "goals": TargetIconComponent,
  "grateful-things": HandHeartIconComponent,
  "habits": RefreshIconComponent,
  "health": ScanHeartIconComponent,
  "ideas": BulbSvgComponent,
  "japanese-study": LetterJIconComponent,
  "journal": PenIconComponent,
  "knowledge-base": BookIconComponent,
  "life-agent": SparklesIconComponent,
  "mind-council": UsersIconComponent,
  "projects": CodeIconComponent,
  "quote-library": BookmarkIconComponent,
  "relationship": HeartIconComponent,
  "role-model": TrophyIconComponent,
  "settings-reserved": GearIconComponent,
  "signals": RadioIconComponent,
  "software-vault": TerminalIconComponent,
  "tasks": CheckedIconComponent,
  "weather": Cloud3IconComponent,
  "weekly-review": DoubleCheckIconComponent,
} satisfies Partial<Record<string, ItshoverAnimatedIconComponent>>;
