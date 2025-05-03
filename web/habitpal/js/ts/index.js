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
const loadRepo = () => {
    const repo = localStorage.getItem("repo");
    var res = { items: [], sections: [] };
    if (repo) {
        const repoJs = JSON.parse(repo);
        if (repoJs && repoJs.items) {
            res = repoJs;
        }
    }
    // if (res.items.length == 0) {
    //   res.items.push({
    //     id: "test",
    //     config: {},
    //     events: [{ timestamp: Date.now() / 1000 }]
    //   });
    //   res.items.push({
    //     id: "test2",
    //     config: {},
    //     events: []
    //   });
    // }
    console.log("Loaded repo:", JSON.stringify(res));
    return res;
};
const storeRepo = (repo) => {
    localStorage.setItem("repo", JSON.stringify(repo));
};
const createP = (text, css) => {
    const p = document.createElement("p");
    p.innerText = text;
    if (css) {
        p.classList.add(css);
    }
    return p;
};
// Given a timestamp, return a nicely formatted duration between that timestamp in unix seconds and now ("34s", "1m 44s", "3h 23m", "5d 2h", etc.)
const formatDuration = (timestamp) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    if (diff < 60) {
        return `${Math.floor(diff)}s`;
    }
    if (diff < 60 * 60) {
        const minutes = Math.floor(diff / 60);
        const seconds = Math.floor(diff % 60);
        return `${minutes}m ${seconds}s`;
    }
    if (diff < 60 * 60 * 24) {
        const hours = Math.floor(diff / (60 * 60));
        const minutes = Math.floor((diff % (60 * 60)) / 60);
        return `${hours}h ${minutes}m`;
    }
    const days = Math.floor(diff / (60 * 60 * 24));
    const hours = Math.floor((diff % (60 * 60 * 24)) / (60 * 60));
    return `${days}d ${hours}h`;
};
const renderItem = (item) => {
    const child = document.getElementById(item.id);
    if (!child) {
        return;
    }
    // Now, work with the new element (which has no listeners)
    child.innerHTML = "";
    child.appendChild(createP(item.id, "item-id"));
    if (item.events.length > 0 && item.events[0].timestamp) {
        child.appendChild(createP(formatDuration(item.events[0].timestamp), "item-timestamp"));
    }
};
const render = (repo) => {
    const root = document.getElementById("root");
    if (!root) {
        return;
    }
    const existingItems = new Set();
    for (const child of root.children) {
        if (child.id) {
            existingItems.add(child.id);
        }
    }
    for (const item of repo.items) {
        if (!existingItems.has(item.id)) {
            const div = document.createElement("div");
            div.id = item.id;
            div.classList.add("item");
            // Add the click listener to the new element
            div.addEventListener("click", () => {
                const repo = loadRepo();
                const ri = repo.items.find((i) => i.id === item.id);
                if (ri) {
                    ri.events.push({ timestamp: Date.now() / 1000, amount: 1 });
                    NormalizeRepo(repo);
                    render(repo);
                    storeRepo(repo);
                }
            });
            root.appendChild(div);
        }
        else {
            existingItems.delete(item.id);
        }
        renderItem(item);
    }
    for (const id of existingItems) {
        const child = document.getElementById(id);
        if (child) {
            root.removeChild(child);
        }
    }
};
const register = () => {
    navigator.serviceWorker.register('sw.js')
        .then(registration => {
        console.log('Service Worker registered successfully:', registration.scope);
    })
        .catch(error => {
        console.error('Service Worker registration failed:', error);
    });
};
const deregister = () => {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
            registration.unregister()
                .then(success => {
                if (success) {
                    console.log('Service Worker unregistered successfully:', registration.scope);
                }
                else {
                    console.log('Failed to unregister Service Worker:', registration.scope);
                }
            })
                .catch(error => {
                console.error('Error unregistering Service Worker:', error);
            });
        });
    });
};
window.addEventListener("load", async (e) => {
    if ('serviceWorker' in navigator) {
        deregister();
        // register();
    }
    else {
        console.log('Service Workers not supported in this browser.');
    }
    const repo = loadRepo();
    NormalizeRepo(repo);
    render(repo);
    const addButton = document.getElementById("add");
    if (addButton) {
        addButton.addEventListener("click", () => {
            const newItemText = document.getElementById("newItem")?.value;
            if (!newItemText) {
                return;
            }
            const repo = loadRepo();
            if (repo.items.find((i) => i.id === newItemText)) {
                return;
            }
            const newItem = {
                id: newItemText,
                config: {},
                events: [],
            };
            repo.items.push(newItem);
            NormalizeRepo(repo);
            render(repo);
            storeRepo(repo);
        });
    }
    const clearButton = document.getElementById("clear");
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            if (confirm("Clear all data?")) {
                const repo = { items: [], sections: [] };
                storeRepo(repo);
                render(repo);
            }
        });
    }
    setInterval(() => {
        const repo = loadRepo();
        NormalizeRepo(repo);
        render(repo);
    }, 500);
});
//# sourceMappingURL=index.js.map