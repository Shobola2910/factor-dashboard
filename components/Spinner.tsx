export default function Spinner({ size = 5 }: { size?: number }) {
  return (
    <span
      className={`inline-block w-${size} h-${size} border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin`}
    />
  );
}
