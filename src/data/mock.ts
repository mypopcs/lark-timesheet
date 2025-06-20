import { format } from "date-fns";
import type { LogEntry } from "../types";

export const MOCK_LOG_ENTRIES: LogEntry[] = [
  {
    id: "mock-1",
    content: "完成了机器人的炮膛开发和测试, 并对相关参数进行了调整和优化",
    date: "2025/06/13",
    time: "16:38",
    type: "开发部",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-2",
    content: "和销售部的负责人沟通了下半年的销售计划",
    date: "2025/06/13",
    time: "17:25",
    type: "销售部",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-3",
    content: "给设计部确认2025年618的营销设计任务",
    date: "2025/06/13",
    time: "17:39",
    type: "设计部",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-4",
    content: "和销售部的XM115同事沟通了营销计划",
    date: "2025/06/13",
    time: "17:53",
    type: "销售部",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-5",
    content: "准备演示用的每日工时记录和看板",
    date: "2025/06/17",
    time: "08:44",
    type: "其他",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-6",
    content: "向CEO演示每日工时记录日志和看板功能，获得赞赏",
    date: "2025/06/17",
    time: "09:15",
    type: "其他",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-7",
    content: "新员工入职培训",
    date: format(new Date(), "yyyy/MM/dd"),
    time: "14:00",
    type: "人力资源",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-8",
    content: "处理紧急服务器故障",
    date: format(new Date(), "yyyy/MM/dd"),
    time: "14:30",
    type: "开发部",
    createdAt: new Date().toISOString(),
  },
];
