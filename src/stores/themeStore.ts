import { defineStore } from "pinia";
import type { ColorTheme, ColorMap } from "../types";

const PRESET_THEMES: ColorTheme[] = [
  {
    bg: "bg-blue-100",
    text: "text-blue-800",
    subtext: "text-blue-500",
    tagBg: "bg-blue-500",
    border: "border-blue-300",
  },
  {
    bg: "bg-green-100",
    text: "text-green-800",
    subtext: "text-green-500",
    tagBg: "bg-green-500",
    border: "border-green-300",
  },
  {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    subtext: "text-yellow-500",
    tagBg: "bg-yellow-500",
    border: "border-yellow-300",
  },
  {
    bg: "bg-purple-100",
    text: "text-purple-800",
    subtext: "text-purple-500",
    tagBg: "bg-purple-500",
    border: "border-purple-300",
  },
  {
    bg: "bg-pink-100",
    text: "text-pink-800",
    subtext: "text-pink-500",
    tagBg: "bg-pink-500",
    border: "border-pink-300",
  },
  {
    bg: "bg-indigo-100",
    text: "text-indigo-800",
    subtext: "text-indigo-500",
    tagBg: "bg-indigo-500",
    border: "border-indigo-300",
  },
  {
    bg: "bg-red-100",
    text: "text-red-800",
    subtext: "text-red-500",
    tagBg: "bg-red-500",
    border: "border-red-300",
  },
  {
    bg: "bg-cyan-100",
    text: "text-cyan-800",
    subtext: "text-cyan-500",
    tagBg: "bg-cyan-500",
    border: "border-cyan-300",
  },
  {
    bg: "bg-orange-100",
    text: "text-orange-800",
    subtext: "text-orange-500",
    tagBg: "bg-orange-500",
    border: "border-orange-300",
  },
  {
    bg: "bg-teal-100",
    text: "text-teal-800",
    subtext: "text-teal-500",
    tagBg: "bg-teal-500",
    border: "border-teal-300",
  },
  {
    bg: "bg-gray-200",
    text: "text-gray-800",
    subtext: "text-gray-500",
    tagBg: "bg-gray-600",
    border: "border-gray-400",
  },
  {
    bg: "bg-slate-200",
    text: "text-slate-800",
    subtext: "text-slate-500",
    tagBg: "bg-slate-600",
    border: "border-slate-400",
  },
];

export const useThemeStore = defineStore("theme", {
  state: () => ({
    themes: PRESET_THEMES as ColorTheme[],
    colorMap: {} as ColorMap,
  }),
  actions: {
    generateColorMap(types: string[]) {
      const newColorMap: ColorMap = {};
      types.forEach((type, index) => {
        newColorMap[type] = this.themes[index % this.themes.length];
      });
      this.colorMap = newColorMap;
    },
    getColorForType(type: string): ColorTheme {
      return this.colorMap[type] || this.themes[0];
    },
  },
});
