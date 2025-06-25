export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center flex-1">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-500 mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}
