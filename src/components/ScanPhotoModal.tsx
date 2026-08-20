"use client";

import { useState, type DragEvent } from "react";
import Image from "next/image";

export type SampleWord = { word: string; meaning: string; wordType: string; ipa: string };
type SampleSet = { id: string; label: string; image: string; words: SampleWord[] };

const SAMPLE_SETS: SampleSet[] = [
  {
    id: "objects",
    label: "Đồ vật hằng ngày",
    image: "/samples/vocab-sample-1.svg",
    words: [
      { word: "apple", meaning: "quả táo", wordType: "n", ipa: "ˈæp.əl" },
      { word: "book", meaning: "quyển sách", wordType: "n", ipa: "bʊk" },
      { word: "water", meaning: "nước", wordType: "n", ipa: "ˈwɔː.tər" },
      { word: "chair", meaning: "cái ghế", wordType: "n", ipa: "tʃer" },
      { word: "phone", meaning: "điện thoại", wordType: "n", ipa: "foʊn" },
    ],
  },
  {
    id: "emotions",
    label: "Cảm xúc",
    image: "/samples/vocab-sample-2.svg",
    words: [
      { word: "happy", meaning: "vui vẻ", wordType: "adj", ipa: "ˈhæp.i" },
      { word: "sad", meaning: "buồn", wordType: "adj", ipa: "sæd" },
      { word: "angry", meaning: "tức giận", wordType: "adj", ipa: "ˈæŋ.ɡri" },
      { word: "tired", meaning: "mệt mỏi", wordType: "adj", ipa: "taɪərd" },
      { word: "excited", meaning: "hào hứng", wordType: "adj", ipa: "ɪkˈsaɪ.tɪd" },
    ],
  },
];

export default function ScanPhotoModal({
  open,
  onClose,
  onOpenCamera,
  onChooseFile,
  onFileDropped,
  onUseSample,
  scanning,
}: {
  open: boolean;
  onClose: () => void;
  onOpenCamera: () => void;
  onChooseFile: () => void;
  onFileDropped: (file: File) => void;
  onUseSample: (words: SampleWord[]) => void;
  scanning: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

  if (!open) return null;

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFileDropped(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-black/50"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-2xl border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black bg-emerald-200 text-xl">
              📷
            </span>
            <h2 className="font-bold text-black">Thêm từ vựng bằng Scan ảnh</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-sm hover:bg-neutral-100"
          >
            ✕
          </button>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Chưa có bảng từ vựng? Thử ảnh mẫu:
          </p>
          <div className="grid grid-cols-2 gap-3">
            {SAMPLE_SETS.map((set) => (
              <button
                key={set.id}
                type="button"
                onClick={() => onUseSample(set.words)}
                disabled={scanning}
                className="group relative h-24 w-full overflow-hidden rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
              >
                <Image
                  src={set.image}
                  alt={`Ảnh mẫu: ${set.label}`}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Dùng ảnh mẫu này
                </span>
                <span className="absolute bottom-0 left-0 right-0 bg-white/90 px-2 py-1 text-xs font-medium text-black">
                  {set.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={
            dragOver
              ? "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-500 bg-emerald-50 px-6 py-10 text-center"
              : "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black bg-neutral-50 px-6 py-10 text-center"
          }
        >
          <span className="text-3xl" aria-hidden>
            ⬆️
          </span>
          <p className="font-semibold text-black">Tải hình ảnh lên</p>
          <p className="text-sm text-neutral-500">Kéo thả ảnh vào đây, hoặc bấm nút bên dưới</p>
        </div>

        {scanning && (
          <p className="text-center text-sm font-medium text-emerald-700">Đang quét ảnh...</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onOpenCamera}
            disabled={scanning}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-black bg-emerald-300 px-5 py-3 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
          >
            📷 Mở Camera
          </button>
          <button
            type="button"
            onClick={onChooseFile}
            disabled={scanning}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-black bg-white px-5 py-3 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
          >
            Chọn file
          </button>
        </div>
      </div>
    </div>
  );
}
