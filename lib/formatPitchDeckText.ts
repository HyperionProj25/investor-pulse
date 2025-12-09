export const formatPitchDeckText = (text: string): string => {
  let formatted = text;

  formatted = formatted.replace(
    /^### (.+)$/gm,
    '<h3 class="text-2xl font-bold text-[#cb6b1e] mb-3 mt-6">$1</h3>'
  );
  formatted = formatted.replace(
    /^## (.+)$/gm,
    '<h2 class="text-3xl font-bold text-[#cb6b1e] mb-4 mt-8">$1</h2>'
  );
  formatted = formatted.replace(
    /^# (.+)$/gm,
    '<h1 class="text-4xl md:text-6xl font-bold text-[#f6e1bd] mb-6 mt-8">$1</h1>'
  );

  formatted = formatted.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="font-bold text-[#cb6b1e]">$1</strong>'
  );

  formatted = formatted.replace(
    /\*(.+?)\*/g,
    '<em class="italic text-[#f6e1bd]">$1</em>'
  );

  formatted = formatted.replace(/\n/g, "<br />");

  return formatted;
};
