type StreakBadgeProps = {
  current: number;
  studiedToday: boolean;
};

export default function StreakBadge({ current, studiedToday }: StreakBadgeProps) {
  return (
    <span
      title={studiedToday ? "Bạn đã học hôm nay" : "Học hôm nay để giữ chuỗi"}
      className={
        current > 0
          ? "inline-flex items-center gap-1 rounded-full border-2 border-black bg-emerald-300 px-2.5 py-1 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000]"
          : "inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-2.5 py-1 text-xs font-medium text-neutral-400 shadow-[2px_2px_0_0_#000]"
      }
    >
      <span aria-hidden>🔥</span>
      {current}
    </span>
  );
}
