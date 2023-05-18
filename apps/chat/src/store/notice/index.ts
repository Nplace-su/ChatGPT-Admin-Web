import { create } from "zustand";
import { persist } from "zustand/middleware";
import md5 from "spark-md5";

const LOCAL_KEY = "notice-store";

interface NoticeStore {
  notice: string | undefined;
  noticeHash: string | undefined;
  updateNotice: (notice: string) => boolean;
}

export const useNoticeStore = create<NoticeStore>()(
  persist(
    (set, get) => ({
      notice: "更多功能正在开发中，关注公众号“Ai问点啥”获取网站最新动态和前沿Ai消息。如有任何问题请添加客服wx账号处理:nplace_sh",
      noticeHash: undefined,

      updateNotice(notice: string) {
        const hashNow = get().noticeHash;
        const hashNew = md5.hash(notice);
        if (hashNew == hashNow) return false;
        set((state) => ({ notice, noticeHash: hashNew }));
        return true;
      },
    }),
    {
      name: LOCAL_KEY,
      version: 1,
    }
  )
);
