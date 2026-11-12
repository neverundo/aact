import type { IconType } from "react-icons";
import { LuBriefcaseBusiness, LuMailPlus } from "react-icons/lu";
import { MdOutlineSpaceDashboard, MdSecurity } from "react-icons/md";
import {
  SlCreditCard,
  SlDoc,
  SlLink,
  SlPeople,
  SlPuzzle,
  SlWallet,
} from "react-icons/sl";
import { TbContract, TbTimelineEventText } from "react-icons/tb";
import { VscGitPullRequestComment } from "react-icons/vsc";
import type { NavIconName } from "@/lib/nav";

export const navIcons: Record<NavIconName, IconType> = {
  home: MdOutlineSpaceDashboard,
  building: LuBriefcaseBusiness,
  calendar: TbTimelineEventText,
  money: VscGitPullRequestComment,
  envelope: LuMailPlus,
  users: SlPeople,
  creditCard: SlCreditCard,
  plug: SlPuzzle,
  percent: TbContract,
  shield: MdSecurity,
  file: SlDoc,
  wallet: SlWallet,
  link: SlLink,
};
