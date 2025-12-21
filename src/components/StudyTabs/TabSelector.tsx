"use client";

import { useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { TabCard } from "./TabCard";

const PRESET_COLORS = [
  "#ff6b4a",
  "#4a9fff",
  "#4aff6b",
  "#ff4af0",
  "#ffd24a",
  "#4afff0",
];

export function TabSelector() {
  const { tabs, activeTabId, addTab, setActiveTab, isSessionActive } = useGameStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleAddTab = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTabName.trim()) {
      addTab(newTabName.trim(), selectedColor);
      setNewTabName("");
      setIsAdding(false);
      setSelectedColor(PRESET_COLORS[(tabs.length + 1) % PRESET_COLORS.length]);
    }
  };

  return (
    <div className="tab-selector">
      <div className="tab-header">
        <h2 className="tab-title">Study Subjects</h2>
        {!isSessionActive && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="add-tab-btn"
          >
            {isAdding ? "Cancel" : "+ Add Subject"}
          </button>
        )}
      </div>

      {/* Add Tab Form */}
      {isAdding && (
        <form onSubmit={handleAddTab} className="add-tab-form">
          <input
            type="text"
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            placeholder="Subject name (e.g., Math, Coding)"
            className="tab-name-input"
            autoFocus
            maxLength={20}
          />
          <div className="color-picker">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`color-option ${selectedColor === color ? "selected" : ""}`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
          <button type="submit" className="create-tab-btn" disabled={!newTabName.trim()}>
            Create Subject
          </button>
        </form>
      )}

      {/* Tab List */}
      <div className="tab-list">
        {tabs.length === 0 ? (
          <div className="empty-tabs">
            <p>No study subjects yet.</p>
            <p className="hint">Add a subject to start focusing!</p>
          </div>
        ) : (
          tabs.map((tab) => (
            <TabCard
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onClick={() => !isSessionActive && setActiveTab(tab.id)}
              disabled={isSessionActive}
            />
          ))
        )}
      </div>

      <style jsx>{`
        .tab-selector {
          background: white;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        .tab-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .tab-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--ink);
          margin: 0;
        }

        .add-tab-btn {
          padding: 8px 16px;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--accent);
          background: transparent;
          border: 2px solid var(--accent);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-tab-btn:hover {
          background: var(--accent);
          color: white;
        }

        .add-tab-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          background: var(--background);
          border-radius: 16px;
          margin-bottom: 20px;
        }

        .tab-name-input {
          padding: 12px 16px;
          font-size: 1rem;
          border: 2px solid transparent;
          border-radius: 12px;
          background: white;
          outline: none;
          transition: all 0.2s ease;
        }

        .tab-name-input:focus {
          border-color: var(--accent);
        }

        .color-picker {
          display: flex;
          gap: 8px;
          justify-content: center;
        }

        .color-option {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .color-option:hover {
          transform: scale(1.1);
        }

        .color-option.selected {
          border-color: var(--ink);
          transform: scale(1.15);
        }

        .create-tab-btn {
          padding: 12px 24px;
          font-size: 1rem;
          font-weight: 600;
          color: white;
          background: var(--accent);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .create-tab-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 107, 74, 0.4);
        }

        .create-tab-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tab-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .empty-tabs {
          text-align: center;
          padding: 32px 16px;
          color: var(--muted);
        }

        .empty-tabs p {
          margin: 0;
        }

        .empty-tabs .hint {
          font-size: 0.875rem;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}
