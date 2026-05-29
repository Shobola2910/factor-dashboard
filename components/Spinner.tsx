const sizeMap: Record<number, string> = {
  3: "w-3 h-3",
  4: "w-4 h-4",
  5: "w-5 h-5",
  6: "w-6 h-6",
  8: "w-8 h-8",
};

export default function Spinner({ size = 5 }: { size?: number }) {
  const cls = sizeMap[size] ?? "w-5 h-5";
  return (
    <span
      className={`inline-block ${cls} border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin`}
    />
  );
}
