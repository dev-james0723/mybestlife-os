import type { ForwardRefExoticComponent, HTMLAttributes, RefAttributes } from "react";
import type { AnimatedIconPackId } from "@/lib/liquid-icons/animated-icon-pack-metadata";
import { ITSHOVER_ICON_COMPONENTS } from "@/lib/liquid-icons/itshover-icon-pack-components";
import { ActivityIcon as ActivityActivityIcon } from "@/components/liquid-icons/animated/kinetic-linework/activity";
import { BookTextIcon as BookTextBookTextIcon } from "@/components/liquid-icons/animated/kinetic-linework/book-text";
import { BotMessageSquareIcon as BotMessageSquareBotMessageSquareIcon } from "@/components/liquid-icons/animated/kinetic-linework/bot-message-square";
import { BoxesIcon as BoxesBoxesIcon } from "@/components/liquid-icons/animated/kinetic-linework/boxes";
import { BrainIcon as BrainBrainIcon } from "@/components/liquid-icons/animated/kinetic-linework/brain";
import { BriefcaseBusinessIcon as BriefcaseBusinessBriefcaseBusinessIcon } from "@/components/liquid-icons/animated/kinetic-linework/briefcase-business";
import { CalendarCheckIcon as CalendarCheckCalendarCheckIcon } from "@/components/liquid-icons/animated/kinetic-linework/calendar-check";
import { CalendarDaysIcon as CalendarDaysCalendarDaysIcon } from "@/components/liquid-icons/animated/kinetic-linework/calendar-days";
import { ChartColumnIncreasingIcon as ChartColumnIncreasingChartColumnIncreasingIcon } from "@/components/liquid-icons/animated/kinetic-linework/chart-column-increasing";
import { ChartLineIcon as ChartLineChartLineIcon } from "@/components/liquid-icons/animated/kinetic-linework/chart-line";
import { CheckCheckIcon as CheckCheckCheckCheckIcon } from "@/components/liquid-icons/animated/kinetic-linework/check-check";
import { CircleCheckIcon as CircleCheckCircleCheckIcon } from "@/components/liquid-icons/animated/kinetic-linework/circle-check";
import { ClipboardCheckIcon as ClipboardCheckClipboardCheckIcon } from "@/components/liquid-icons/animated/kinetic-linework/clipboard-check";
import { CloudSunIcon as CloudSunCloudSunIcon } from "@/components/liquid-icons/animated/kinetic-linework/cloud-sun";
import { CompassIcon as CompassCompassIcon } from "@/components/liquid-icons/animated/kinetic-linework/compass";
import { CpuIcon as CpuCpuIcon } from "@/components/liquid-icons/animated/kinetic-linework/cpu";
import { FileCheck2Icon as FileCheck2FileCheck2Icon } from "@/components/liquid-icons/animated/kinetic-linework/file-check-2";
import { FilePenLineIcon as FilePenLineFilePenLineIcon } from "@/components/liquid-icons/animated/kinetic-linework/file-pen-line";
import { FileStackIcon as FileStackFileStackIcon } from "@/components/liquid-icons/animated/kinetic-linework/file-stack";
import { FileTextIcon as FileTextFileTextIcon } from "@/components/liquid-icons/animated/kinetic-linework/file-text";
import { FolderCodeIcon as FolderCodeFolderCodeIcon } from "@/components/liquid-icons/animated/kinetic-linework/folder-code";
import { FolderKanbanIcon as FolderKanbanFolderKanbanIcon } from "@/components/liquid-icons/animated/kinetic-linework/folder-kanban";
import { FolderLockIcon as FolderLockFolderLockIcon } from "@/components/liquid-icons/animated/kinetic-linework/folder-lock";
import { FoldersIcon as FoldersFoldersIcon } from "@/components/liquid-icons/animated/kinetic-linework/folders";
import { GaugeIcon as GaugeGaugeIcon } from "@/components/liquid-icons/animated/kinetic-linework/gauge";
import { GraduationCapIcon as GraduationCapGraduationCapIcon } from "@/components/liquid-icons/animated/kinetic-linework/graduation-cap";
import { HandHeartIcon as HandHeartHandHeartIcon } from "@/components/liquid-icons/animated/kinetic-linework/hand-heart";
import { HeartHandshakeIcon as HeartHandshakeHeartHandshakeIcon } from "@/components/liquid-icons/animated/kinetic-linework/heart-handshake";
import { HeartPulseIcon as HeartPulseHeartPulseIcon } from "@/components/liquid-icons/animated/kinetic-linework/heart-pulse";
import { HistoryIcon as HistoryHistoryIcon } from "@/components/liquid-icons/animated/kinetic-linework/history";
import { IdCardIcon as IdCardIdCardIcon } from "@/components/liquid-icons/animated/kinetic-linework/id-card";
import { LanguagesIcon as LanguagesLanguagesIcon } from "@/components/liquid-icons/animated/kinetic-linework/languages";
import { LayoutGridIcon as LayoutGridLayoutGridIcon } from "@/components/liquid-icons/animated/kinetic-linework/layout-grid";
import { LayoutPanelTopIcon as LayoutPanelTopLayoutPanelTopIcon } from "@/components/liquid-icons/animated/kinetic-linework/layout-panel-top";
import { MessageCircleMoreIcon as MessageCircleMoreMessageCircleMoreIcon } from "@/components/liquid-icons/animated/kinetic-linework/message-circle-more";
import { MessageSquareMoreIcon as MessageSquareMoreMessageSquareMoreIcon } from "@/components/liquid-icons/animated/kinetic-linework/message-square-more";
import { RadioTowerIcon as RadioTowerRadioTowerIcon } from "@/components/liquid-icons/animated/kinetic-linework/radio-tower";
import { RocketIcon as RocketRocketIcon } from "@/components/liquid-icons/animated/kinetic-linework/rocket";
import { ScanFaceIcon as ScanFaceScanFaceIcon } from "@/components/liquid-icons/animated/kinetic-linework/scan-face";
import { SettingsIcon as SettingsSettingsIcon } from "@/components/liquid-icons/animated/kinetic-linework/settings";
import { SquarePenIcon as SquarePenSquarePenIcon } from "@/components/liquid-icons/animated/kinetic-linework/square-pen";
import { SunIcon as SunSunIcon } from "@/components/liquid-icons/animated/kinetic-linework/sun";
import { TelescopeIcon as TelescopeTelescopeIcon } from "@/components/liquid-icons/animated/kinetic-linework/telescope";
import { UserRoundCheckIcon as UserRoundCheckUserRoundCheckIcon } from "@/components/liquid-icons/animated/kinetic-linework/user-round-check";
import { UserRoundCogIcon as UserRoundCogUserRoundCogIcon } from "@/components/liquid-icons/animated/kinetic-linework/user-round-cog";
import { UsersIcon as UsersUsersIcon } from "@/components/liquid-icons/animated/kinetic-linework/users";
import { UsersRoundIcon as UsersRoundUsersRoundIcon } from "@/components/liquid-icons/animated/kinetic-linework/users-round";
import { WalletIcon as WalletWalletIcon } from "@/components/liquid-icons/animated/kinetic-linework/wallet";
import { WaypointsIcon as WaypointsWaypointsIcon } from "@/components/liquid-icons/animated/kinetic-linework/waypoints";
import { WorkflowIcon as WorkflowWorkflowIcon } from "@/components/liquid-icons/animated/kinetic-linework/workflow";

export type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

export type AnimatedIconProps = HTMLAttributes<HTMLDivElement> & {
  size?: number;
};

export type AnimatedIconComponent = ForwardRefExoticComponent<
  AnimatedIconProps & RefAttributes<AnimatedIconHandle>
>;

export const ANIMATED_ICON_COMPONENTS: Record<
  AnimatedIconPackId,
  Partial<Record<string, AnimatedIconComponent>>
> = {
  "kinetic-linework": {
    "about-me": IdCardIdCardIcon as AnimatedIconComponent,
    "ai-knowledge": CpuCpuIcon as AnimatedIconComponent,
    "analytics": ChartColumnIncreasingChartColumnIncreasingIcon as AnimatedIconComponent,
    "assets": BoxesBoxesIcon as AnimatedIconComponent,
    "brain": BrainBrainIcon as AnimatedIconComponent,
    "bucket-list": CheckCheckCheckCheckIcon as AnimatedIconComponent,
    "calendar": CalendarDaysCalendarDaysIcon as AnimatedIconComponent,
    "career": GaugeGaugeIcon as AnimatedIconComponent,
    "career-analytics": ChartLineChartLineIcon as AnimatedIconComponent,
    "career-coach": MessageCircleMoreMessageCircleMoreIcon as AnimatedIconComponent,
    "career-compass": CompassCompassIcon as AnimatedIconComponent,
    "career-journal": FilePenLineFilePenLineIcon as AnimatedIconComponent,
    "career-network": WaypointsWaypointsIcon as AnimatedIconComponent,
    "career-pipeline": WorkflowWorkflowIcon as AnimatedIconComponent,
    "career-profile": UserRoundCogUserRoundCogIcon as AnimatedIconComponent,
    "career-timeline": HistoryHistoryIcon as AnimatedIconComponent,
    "career-vault": FolderLockFolderLockIcon as AnimatedIconComponent,
    "category-career": BriefcaseBusinessBriefcaseBusinessIcon as AnimatedIconComponent,
    "category-command-center": LayoutPanelTopLayoutPanelTopIcon as AnimatedIconComponent,
    "category-goals-execution": RocketRocketIcon as AnimatedIconComponent,
    "category-knowledge": BookTextBookTextIcon as AnimatedIconComponent,
    "category-learning": GraduationCapGraduationCapIcon as AnimatedIconComponent,
    "category-people": UsersRoundUsersRoundIcon as AnimatedIconComponent,
    "category-resources": FoldersFoldersIcon as AnimatedIconComponent,
    "category-self": ScanFaceScanFaceIcon as AnimatedIconComponent,
    "daily-planner": CalendarCheckCalendarCheckIcon as AnimatedIconComponent,
    "dashboard": LayoutGridLayoutGridIcon as AnimatedIconComponent,
    "documents": FileTextFileTextIcon as AnimatedIconComponent,
    "finance": WalletWalletIcon as AnimatedIconComponent,
    "garden": SunSunIcon as AnimatedIconComponent,
    "goals": CircleCheckCircleCheckIcon as AnimatedIconComponent,
    "grateful-things": HandHeartHandHeartIcon as AnimatedIconComponent,
    "habits": ActivityActivityIcon as AnimatedIconComponent,
    "health": HeartPulseHeartPulseIcon as AnimatedIconComponent,
    "ideas": TelescopeTelescopeIcon as AnimatedIconComponent,
    "japanese-study": LanguagesLanguagesIcon as AnimatedIconComponent,
    "journal": SquarePenSquarePenIcon as AnimatedIconComponent,
    "knowledge-base": FileStackFileStackIcon as AnimatedIconComponent,
    "life-agent": BotMessageSquareBotMessageSquareIcon as AnimatedIconComponent,
    "mind-council": UsersUsersIcon as AnimatedIconComponent,
    "projects": FolderKanbanFolderKanbanIcon as AnimatedIconComponent,
    "quote-library": MessageSquareMoreMessageSquareMoreIcon as AnimatedIconComponent,
    "relationship": HeartHandshakeHeartHandshakeIcon as AnimatedIconComponent,
    "role-model": UserRoundCheckUserRoundCheckIcon as AnimatedIconComponent,
    "settings-reserved": SettingsSettingsIcon as AnimatedIconComponent,
    "signals": RadioTowerRadioTowerIcon as AnimatedIconComponent,
    "software-vault": FolderCodeFolderCodeIcon as AnimatedIconComponent,
    "tasks": ClipboardCheckClipboardCheckIcon as AnimatedIconComponent,
    "weather": CloudSunCloudSunIcon as AnimatedIconComponent,
    "weekly-review": FileCheck2FileCheck2Icon as AnimatedIconComponent,
  },
  "hover-intent": ITSHOVER_ICON_COMPONENTS as Partial<Record<string, AnimatedIconComponent>>,
};

export function getAnimatedIconPackAssetComponent(
  iconPack: AnimatedIconPackId,
  assetId: string,
): AnimatedIconComponent | undefined {
  return ANIMATED_ICON_COMPONENTS[iconPack]?.[assetId];
}
