import {
  AlignLeftIcon,
  BrainIcon,
  ImageIcon,
  LayersIcon,
  PuzzleIcon,
  ScaleIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import type { QuizFormat, QuizType } from "@/lib/quiz";

export const FORMAT_ICONS: Record<QuizFormat, LucideIcon> = {
  image: ImageIcon,
  text: AlignLeftIcon,
  mixed: LayersIcon,
};

export const TYPE_ICONS: Record<QuizType, LucideIcon> = {
  personality: UserRoundIcon,
  preference: ScaleIcon,
  knowledge: BrainIcon,
  logic: PuzzleIcon,
};

export const TYPE_COLORS: Record<QuizType, string> = {
  personality: "bg-pink-100 text-pink-800 ring-pink-200",
  preference: "bg-amber-100 text-amber-900 ring-amber-200",
  knowledge: "bg-sky-100 text-sky-900 ring-sky-200",
  logic: "bg-emerald-100 text-emerald-900 ring-emerald-200",
};
