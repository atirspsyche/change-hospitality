import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getTeamPageItems, teamPageSize, type TeamMember } from '../../data/team';
import ProfileCard from './ProfileCard';
import './TeamMemberGrid.css';

interface TeamMemberGridProps {
  members: TeamMember[];
  officeName: string;
  gridId: string;
}

export default function TeamMemberGrid({ members, officeName, gridId }: TeamMemberGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [ready, setReady] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const previousPage = useRef(currentPage);
  const pageCount = Math.ceil(members.length / teamPageSize);
  const start = (currentPage - 1) * teamPageSize;
  const end = Math.min(start + teamPageSize, members.length);
  const rangeId = `${gridId}-range`;

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (previousPage.current === currentPage) return;
    previousPage.current = currentPage;
    const grid = gridRef.current;
    if (!grid) return;
    grid.focus({ preventScroll: true });
    grid.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [currentPage]);

  return (
    <div className="team-member-directory" data-team-directory data-ready={ready}>
      <div
        id={gridId}
        ref={gridRef}
        className="team-card-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        role="region"
        aria-label={`${officeName} team members`}
        aria-describedby={rangeId}
        tabIndex={-1}
        data-team-member-grid
      >
        {members.slice(start, end).map((member) => (
          <ProfileCard key={member._id} {...member} enableTilt={true} />
        ))}
      </div>

      <footer className="team-pagination-footer">
        <p
          id={rangeId}
          className="team-pagination-range"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-team-page-range
        >
          Showing <strong>{start + 1}-{end}</strong> of <strong>{members.length}</strong> {members.length === 1 ? 'person' : 'people'}
          {pageCount > 1 && <span className="sr-only">. Page {currentPage} of {pageCount}.</span>}
        </p>

        {pageCount > 1 && (
          <nav className="team-pagination" aria-label={`${officeName} team pages`} data-team-pagination>
            <button
              type="button"
              className="team-page-button team-page-button--direction"
              aria-label={`Previous ${officeName} team page`}
              aria-controls={gridId}
              disabled={!ready || currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ArrowLeft size={18} aria-hidden="true" />
              <span className="team-pagination-direction-label">Previous</span>
            </button>

            <div className="team-pagination-pages">
              {getTeamPageItems(currentPage, pageCount).map((item) => (
                typeof item === 'number' ? (
                  <button
                    key={item}
                    type="button"
                    className="team-page-button"
                    aria-label={`Show ${officeName} team page ${item}`}
                    aria-current={item === currentPage ? 'page' : undefined}
                    aria-controls={gridId}
                    disabled={!ready}
                    onClick={() => setCurrentPage(item)}
                  >
                    {String(item).padStart(2, '0')}
                  </button>
                ) : (
                  <span key={item} className="team-pagination-ellipsis" aria-hidden="true">...</span>
                )
              ))}
            </div>

            <p className="team-pagination-position" aria-hidden="true">
              <strong>{String(currentPage).padStart(2, '0')}</strong>
              <span> / {String(pageCount).padStart(2, '0')}</span>
            </p>

            <button
              type="button"
              className="team-page-button team-page-button--direction"
              aria-label={`Next ${officeName} team page`}
              aria-controls={gridId}
              disabled={!ready || currentPage === pageCount}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <span className="team-pagination-direction-label">Next</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </nav>
        )}
      </footer>
    </div>
  );
}
