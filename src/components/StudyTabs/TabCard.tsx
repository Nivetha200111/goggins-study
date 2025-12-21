"use client";

import type { StudyTab } from "@/types";
import { useGameStore } from "@/store/gameStore";

interface TabCardProps {
  tab: StudyTab;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function TabCard({ tab, isActive, onClick, disabled }: TabCardProps) {
  const { removeTab, isSessionActive } = useGameStore();

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes.toFixed(0)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div
      className={`tab-card ${isActive ? "active" : ""} ${disabled ? "disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          onClick();
        }
      }}
    >
      {/* Color indicator */}
      <div className="tab-color" style={{ backgroundColor: tab.color }} />

      {/* Content */}
      <div className="tab-content">
        <h3 className="tab-name">{tab.name}</h3>
        <div className="tab-stats">
          <span className="stat">
            <span className="stat-icon">&#128337;</span>
            {formatTime(tab.focusMinutes)}
          </span>
          <span className="stat">
            <span className="stat-icon">&#11088;</span>
            {tab.xp} XP
          </span>
          {tab.distractions > 0 && (
            <span className="stat distraction">
              <span className="stat-icon">&#128683;</span>
              {tab.distractions}
            </span>
          )}
        </div>
      </div>

      {/* Delete button (only when not in session) */}
      {!isSessionActive && (
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            removeTab(tab.id);
          }}
          aria-label={`Delete ${tab.name}`}
        >
          &times;
        </button>
      )}

      {/* Active indicator */}
      {isActive && <div className="active-indicator">SELECTED</div>}

      <style jsx>{`
        .tab-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--background);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .tab-card:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .tab-card.active {
          border-color: var(--accent);
          background: white;
        }

        .tab-card.disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .tab-color {
          width: 8px;
          height: 48px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .tab-content {
          flex: 1;
          min-width: 0;
        }

        .tab-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--ink);
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tab-stats {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: var(--muted);
        }

        .stat-icon {
          font-size: 0.875rem;
        }

        .stat.distraction {
          color: #dc2626;
        }

        .delete-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          color: var(--muted);
          background: transparent;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s ease;
        }

        .tab-card:hover .delete-btn {
          opacity: 1;
        }

        .delete-btn:hover {
          color: #dc2626;
          background: rgba(220, 38, 38, 0.1);
        }

        .active-indicator {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 0.625rem;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: 1px;
        }

        .tab-card.active .delete-btn {
          display: none;
        }
      `}</style>
    </div>
  );
}
