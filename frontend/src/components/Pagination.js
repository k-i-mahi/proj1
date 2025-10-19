import React from 'react';
import './Pagination.css';

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = true,
  maxVisible = 7,
}) => {
  const getPageNumbers = () => {
    const pages = [];

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near the start
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handlePageClick = (page) => {
    if (page === '...' || page === currentPage) return;
    onPageChange(page);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleFirst = () => {
    if (currentPage !== 1) {
      onPageChange(1);
    }
  };

  const handleLast = () => {
    if (currentPage !== totalPages) {
      onPageChange(totalPages);
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      {showInfo && (
        <div className="pagination-info">
          <span>
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>
        </div>
      )}

      <div className="pagination-controls">
        {/* First Page Button */}
        <button
          className="pagination-btn pagination-btn-edge"
          onClick={handleFirst}
          disabled={currentPage === 1}
          title="First page"
        >
          ««
        </button>

        {/* Previous Button */}
        <button
          className="pagination-btn pagination-btn-nav"
          onClick={handlePrevious}
          disabled={currentPage === 1}
          title="Previous page"
        >
          ‹ Previous
        </button>

        {/* Page Numbers */}
        <div className="pagination-numbers">
          {getPageNumbers().map((page, index) =>
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                ...
              </span>
            ) : (
              <button
                key={page}
                className={`pagination-number ${
                  currentPage === page ? 'active' : ''
                }`}
                onClick={() => handlePageClick(page)}
              >
                {page}
              </button>
            ),
          )}
        </div>

        {/* Next Button */}
        <button
          className="pagination-btn pagination-btn-nav"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          title="Next page"
        >
          Next ›
        </button>

        {/* Last Page Button */}
        <button
          className="pagination-btn pagination-btn-edge"
          onClick={handleLast}
          disabled={currentPage === totalPages}
          title="Last page"
        >
          »»
        </button>
      </div>
    </div>
  );
};

export default Pagination;
