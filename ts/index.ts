export type Event = {
  timestamp: number;
};

export type Item = {
  id: string;
  section: string;
  events: Event[];
};

export type Repo = {
  items: Item[];
  sections: string[];
};

const loadRepo = (): Repo => {
  const repo = localStorage.getItem("repo");
  if (repo) {
    return JSON.parse(repo) as Repo;
  }
  return { items: [], sections: [] };
};

const storeRepo = (repo: Repo) => {
  localStorage.setItem("repo", JSON.stringify(repo));
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
    // deregister();
    register();
  } else {
    console.log('Service Workers not supported in this browser.');
  }
  const repo = loadRepo();
});
