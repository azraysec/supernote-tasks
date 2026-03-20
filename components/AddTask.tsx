import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface AddTaskProps {
  onAdd: (title: string, dueDate: string | null) => void;
}

export const AddTask: React.FC<AddTaskProps> = ({ onAdd }) => {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), dueDate || null);
    setTitle('');
    setDueDate('');
    setExpanded(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className="input input-bordered flex-1"
          placeholder="Add a task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
        />
        <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
          <Plus size={16} />
        </button>
      </div>
      {expanded && (
        <div className="flex gap-2 items-center">
          <label className="text-sm text-base-content/60">Due date:</label>
          <input
            type="date"
            className="input input-bordered input-sm"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded(false)}>
            Cancel
          </button>
        </div>
      )}
    </form>
  );
};
