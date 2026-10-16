import type { Role } from "./types";

export type DemoUser = {
  id: string;
  displayName: string;
  role: Role;
  blurb: string;
};

export const DEMO_USERS: DemoUser[] = [
  { id: "user_wendy", displayName: "溫蒂", role: "admin", blurb: "管理員，看全部訂單" },
  { id: "user_mei", displayName: "小美", role: "helper", blurb: "小幫手，只看自己的訂單" },
  { id: "user_ken", displayName: "阿健", role: "helper", blurb: "小幫手，只看自己的訂單" },
  { id: "user_lin", displayName: "小林", role: "pending", blurb: "還沒核准，會看到等待畫面" },
];

export const DEMO_USER_IDS = DEMO_USERS.map((user) => user.id);

export function isDemoUserId(id: string) {
  return DEMO_USER_IDS.includes(id);
}
