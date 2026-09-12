"use client";

import { useState } from "react";

// Self-contained client component (button + its own modal, no external state) so it can drop
// straight into the server-rendered /vocabulary page without lifting state up — same reasoning
// as OnboardingHint.tsx being usable directly inside a Server Component.
export default function MethodsInfoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-3.5 py-1.5 text-xs font-semibold text-violet-700 shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        💡 Giới thiệu phương pháp ghi nhớ
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 cursor-default bg-black/50"
          />
          <div className="relative flex max-h-[90vh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-2xl border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black bg-violet-200 text-xl">
                  💡
                </span>
                <h2 className="font-bold text-black">Phương pháp ghi nhớ</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-sm hover:bg-neutral-100"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border-2 border-black bg-amber-50 p-4">
              <p className="font-bold text-black">🏰 Cung điện trí nhớ</p>
              <p className="mt-1.5 text-sm text-neutral-700">
                Kỹ thuật <em>Method of Loci</em>{" "}
                mà các nhà vô địch trí nhớ thế giới hay dùng: mỗi từ được gắn vào một địa điểm
                quen thuộc (phòng khách, tủ lạnh, bàn học...)
                cùng một hình ảnh liên tưởng thật kỳ lạ, cường điệu. Khi cần nhớ lại, bạn chỉ
                cần hình dung &ldquo;dạo qua&rdquo; từng địa điểm đó.
              </p>
              <p className="mt-2 rounded-lg border-2 border-black bg-white px-3 py-2 text-xs text-neutral-600">
                <strong className="text-black">Ví dụ:</strong> từ{" "}
                <strong className="text-amber-700">benefit</strong>{" "}
                được gắn vào Tủ lạnh, với hình ảnh &ldquo;một quả chuối khổng lồ phát sáng chữ
                BEN-EFIT nhảy múa trong tủ
                lạnh&rdquo; — nhìn thấy tủ lạnh là bật ra ngay từ &ldquo;benefit&rdquo;.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-full border-2 border-black bg-violet-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
