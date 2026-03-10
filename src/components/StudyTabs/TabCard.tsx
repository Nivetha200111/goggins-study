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
      <div className="tab-color" style={{ backgroundColor: tab.color }} />

      <div className="tab-content">
        <h3 className="tab-name">{tab.name}</h3>
        <div className="tab-stats">
          <span className="stat">Time {formatTime(tab.focusMinutes)}</span>
          <span className="stat">XP {tab.xp}</span>
          {tab.distractions > 0 ? (
            <span className="stat danger">Miss {tab.distractions}</span>
          ) : null}
        </div>
      </div>

      {!isSessionActive && (
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            removeTab(tab.id);
          }}
          aria-label={`Delete ${tab.name}`}
        >
          Del
        </button>
      )}

      {isActive ? <div className="active-indicator">Active</div> : null}

      <style jsx>{`
        .tab-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          background: rgba(10, 4, 20, 0.45);
          cursor: pointer;
          transition: transform 0.08s steps(2, jump-none), box-shadow 0.08s steps(2, jump-none);
        }

        .tab-card:hover:not(.disabled) {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0 var(--shadow);
        }

        .tab-card.active {
          background: #452482;
          border-color: #14091f;
        }

        .tab-card.disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .tab-color {
          width: 16px;
          height: 72px;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          flex-shrink: 0;
        }

        .tab-content {
          min-width: 0;
          flex: 1;
        }

        .tab-name {
          margin: 0;
          color: #fff6bf;
          font-size: 0.9rem;
          line-height: 1.5;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tab-stats {
          margin-top: 8px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .stat {
          padding: 6px 8px;
          border: 2px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.05);
          color: var(--foreground);
          font-size: 1.1rem;
          line-height: 1;
        }

        .stat.danger {
          color: #ffd2d2;
          background: rgba(255, 122, 122, 0.18);
        }

        .delete-btn,
        .active-indicator {
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          min-height: 38px;
          padding: 6px 10px;
          font-size: 0.68rem;
          line-height: 1.6;
        }

        .delete-btn {
          background: var(--danger);
          color: #260b0b;
          cursor: pointer;
        }

        .active-indicator {
          background: var(--success);
          color: #10220e;
        }
      `}</style>
    </div>
  );
}
