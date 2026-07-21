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
          ? "inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300"
          : "inline-flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-400"
      }
    >
      <span aria-hidden>🔥</span>
      {current}
    </span>
  );
}
