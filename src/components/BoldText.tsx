export default function BoldText({
  text,
  pinyinByWord,
}: {
  text: string;
  // Chinese-only: word -> Pinyin, so a bolded Chinese word can show its Pinyin inline right in
  // the story flow (not just in the vocabulary chip row above). The underlying `text` stays
  // untouched (plain Chinese + **bold** markers) so speak() still reads it correctly — Pinyin
  // is purely a render-time annotation, never part of the actual story content.
  pinyinByWord?: Record<string, string>;
}) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (!(part.startsWith("**") && part.endsWith("**"))) {
          return <span key={index}>{part}</span>;
        }
        const word = part.slice(2, -2);
        const pinyin = pinyinByWord?.[word];
        return (
          <strong key={index} className="font-semibold text-amber-700">
            {word}
            {pinyin && <span className="ml-0.5 text-xs font-normal text-amber-700/70">({pinyin})</span>}
          </strong>
        );
      })}
    </>
  );
}
