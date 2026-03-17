// Minimal Router
const Router = {
  currentScreen: null,

  init: function () {
    // Handle browser back/forward
    window.addEventListener("popstate", (e) => {
      if (e.state && e.state.screen) {
        this.show(e.state.screen, false);
      }
    });

    // Set initial state
    const initialScreen = window.location.hash.slice(1) || "home";
    this.show(initialScreen, true);
  },

  show: function (screenName, pushState = true) {
    const screenId = "screen-" + screenName;
    const targetScreen = document.getElementById(screenId);

    if (!targetScreen) {
      console.error("Screen not found:", screenId);
      return;
    }

    // Hide current screen
    if (this.currentScreen) {
      this.currentScreen.classList.remove("active");
    }

    // Show new screen
    targetScreen.classList.add("active");
    this.currentScreen = targetScreen;

    // Update browser history
    if (pushState) {
      const url =
        screenName === "home"
          ? window.location.pathname
          : window.location.pathname + "#" + screenName;
      history.pushState({ screen: screenName }, "", url);
    }

    // Update active nav items
    this.updateNav(screenName);
  },

  updateNav: function (screenName) {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      const navTarget = item.getAttribute("data-nav");
      if (navTarget === screenName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  },
};
