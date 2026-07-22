import React from 'react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  count: number;
}

export function PaginationControls({ currentPage, totalPages, onPageChange, count }: PaginationControlsProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between mt-6 px-2 py-3 border-t border-border">
      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{count}</span> total entries
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1 text-sm bg-surface border border-border rounded-md text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-muted transition"
        >
          Previous
        </button>
        <div className="px-3 py-1 text-sm font-medium">
          Page {currentPage} of {Math.max(1, totalPages)}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 text-sm bg-surface border border-border rounded-md text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-muted transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
