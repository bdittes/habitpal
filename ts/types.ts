export type ItemConfig = {
  section?: string;
  active?: boolean;
};

// Prefers a.
export const MergeConfig = (a?: ItemConfig, b?: ItemConfig): ItemConfig => {
  return {
    section: a?.section || b?.section,
    active: a?.active || b?.active
  }
};

export type Event = {
  timestamp: number;
  amount?: number;
  config?: ItemConfig;
};

export type Item = {
  id: string;
  config: ItemConfig;
  events: Event[];
};

export const NormalizeItem = (item: Item): Item => {
  item.events.sort((a, b) => b.timestamp - a.timestamp);
  item.config = {};
  for (let i = item.events.length - 1; i >= 0; i--) {
    const e = item.events[i];
    item.config = MergeConfig(e.config, item.config);
  };
  return item;
};

export type Repo = {
  items: Item[];
  sections: string[];
};

export const NormalizeRepo = (repo: Repo): Repo => {
  repo.items.sort((a, b) => a.id.localeCompare(b.id));
  for (const item of repo.items) {
    NormalizeItem(item);
  }
  return repo;
};
