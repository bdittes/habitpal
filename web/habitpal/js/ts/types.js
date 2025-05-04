// Prefers a.
export const MergeConfig = (a, b) => {
    return {
        section: a?.section || b?.section,
        active: a?.active || b?.active
    };
};
export const NormalizeItem = (item) => {
    item.events.sort((a, b) => b.timestamp - a.timestamp);
    item.config = {};
    for (let i = item.events.length - 1; i >= 0; i--) {
        const e = item.events[i];
        item.config = MergeConfig(e.config, item.config);
    }
    ;
    return item;
};
export const NormalizeRepo = (repo) => {
    repo.items.sort((a, b) => a.id.localeCompare(b.id));
    for (const item of repo.items) {
        NormalizeItem(item);
    }
    return repo;
};
//# sourceMappingURL=types.js.map