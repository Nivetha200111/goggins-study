"use client";

import { useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { TabCard } from "./TabCard";

const PRESET_COLORS = [
  "#ff6e9f",
  "#46d8ff",
  "#ffd84a",
  "#86ff63",
  "#c38bff",
  "#ff8c42",
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
        <div>
          <p className="tab-kicker">Quest Slots</p>
          <h2 className="tab-title">Study Save Files</h2>
        </div>
        {!isSessionActive && (
          <button onClick={() => setIsAdding(!isAdding)} className="add-tab-btn">
            {isAdding ? "Close" : "New Slot"}
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAddTab} className="add-tab-form">
          <input
            type="text"
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            placeholder="Quest name"
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
            Save Slot
          </button>
        </form>
      )}

      <div className="tab-list">
        {tabs.length === 0 ? (
          <div className="empty-tabs">
            <p>No quest slots yet.</p>
            <p className="hint">Create one before starting the run.</p>
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
          background: linear-gradient(180deg, var(--panel-strong) 0%, var(--panel) 100%);
          border: 4px solid var(--edge);
          box-shadow: var(--shadow-strong);
          padding: 18px;
        }

        .tab-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .tab-kicker {
          margin: 0 0 8px;
          color: var(--accent);
          font-size: 0.74rem;
          line-height: 1.7;
        }

        .tab-title {
          margin: 0;
          font-size: 1.06rem;
          line-height: 1.45;
          color: #fff6bf;
        }

        .add-tab-btn,
        .create-tab-btn {
          min-height: 46px;
          padding: 10px 14px;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          cursor: pointer;
        }

        .add-tab-btn {
          background: var(--accent-3);
          color: #091120;
        }

        .create-tab-btn {
          background: var(--success);
          color: #0e1f0c;
        }

        .create-tab-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .add-tab-form {
          display: grid;
          gap: 12px;
          margin-bottom: 16px;
          padding: 14px;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          background: rgba(10, 4, 20, 0.5);
        }

        .tab-name-input {
          width: 100%;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          background: #f2f0ff;
          color: #13091f;
          padding: 12px 14px;
          font-size: 1.55rem;
          line-height: 1.1;
        }

        .color-picker {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .color-option {
          width: 36px;
          height: 36px;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          cursor: pointer;
        }

        .color-option.selected {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0 var(--shadow);
        }

        .tab-list {
          display: grid;
          gap: 10px;
        }

        .empty-tabs {
          border: 4px dashed rgba(255, 255, 255, 0.12);
          padding: 18px;
          text-align: center;
          color: var(--foreground);
        }

        .empty-tabs p {
          margin: 0;
          font-size: 1.4rem;
          line-height: 1.05;
        }

        .hint {
          margin-top: 8px !important;
          color: var(--muted);
        }
      `}</style>
    </div>
  );
}
