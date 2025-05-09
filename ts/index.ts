import { ItemConfig, Event, Item, Repo, NormalizeRepo } from "./types.js";
import { TriggerDebouncedSave } from "./gsync.js";

// declare global {
//   interface Window {
//     GapiLoaded: () => void;
//     GisLoaded: () => void;
//   }
// }

// window.GapiLoaded = GapiLoaded;
// window.GisLoaded = GisLoaded;
// console.log(GapiLoaded);

const loadRepo = (): Repo => {
  const repo = localStorage.getItem("repo");
  var res: Repo = { items: [], sections: [] };
  if (repo) {
    const repoJs = JSON.parse(repo) as Repo;
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

const storeRepo = (repo: Repo) => {
  localStorage.setItem("repo", JSON.stringify(repo));
  TriggerDebouncedSave();
};

const createP = (text: string, css?: string): HTMLParagraphElement => {
  const p = document.createElement("p");
  p.innerText = text;
  if (css) {
    p.classList.add(css);
  }
  return p;
};

// Given a timestamp, return a nicely formatted duration between that timestamp in unix seconds and now ("34s", "1m 44s", "3h 23m", "5d 2h", etc.)
const formatDuration = (timestamp: number): string => {
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

const renderItem = (item: Item) => {
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

const render = (repo: Repo) => {
  const root = document.getElementById("root");
  if (!root) {
    return;
  }
  const existingItems = new Set<string>();
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
    } else {
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
          } else {
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
  } else {
    console.log('Service Workers not supported in this browser.');
  }
  const repo = loadRepo();
  NormalizeRepo(repo);
  render(repo);

  document.getElementById("add-button")?.addEventListener("click", () => {
    const newItemText = (document.getElementById("newItem") as HTMLTextAreaElement)?.value;
    if (!newItemText) {
      return;
    }
    const repo = loadRepo();
    if (repo.items.find((i) => i.id === newItemText)) {
      return;
    }
    const newItem: Item = {
      id: newItemText,
      config: {},
      events: [],
    };
    repo.items.push(newItem);
    NormalizeRepo(repo);
    render(repo);
    storeRepo(repo);
  });

  document.getElementById("clear-button")?.addEventListener("click", () => {
    if (confirm("Clear all data?")) {
      const repo: Repo = { items: [], sections: [] };
      storeRepo(repo);
      render(repo);
    }
  });

  document.getElementById("debug-button")?.addEventListener("click", () => {
    const txt = document.getElementById("newItem") as HTMLTextAreaElement;
    if (txt) {
      txt.value = JSON.stringify(localStorage.getItem("repo"));
    }
  });

  setInterval(() => {
    const repo = loadRepo();
    NormalizeRepo(repo);
    render(repo);
  }, 500);
});
