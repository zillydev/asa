// Chrome's new tab override steals focus to the omnibox.
// Reloading with a query param allows autofocus to work.
if (location.search !== "?x") {
  location.search = "?x"
  throw new Error()
}

/**
 * Main Application Initialization Module
 * Orchestrates the startup and wiring of all modules
 */

const App = (() => {
  let uiVisible = true

  /**
   * Initialize search input focus
   */
  const initializeSearchFocus = () => {
    Core.id("search-value").focus()
  }

  /**
   * Toggle UI visibility
   */
  const toggleUI = () => {
    uiVisible = !uiVisible
    const app = Core.id("app")

    if (uiVisible) {
      app.style.opacity = "1"
      app.style.pointerEvents = "auto"
    } else {
      app.style.opacity = "0"
      app.style.pointerEvents = "none"
    }
  }

  /**
   * Initialize global keyboard shortcuts
   */
  const initializeGlobalShortcuts = () => {
    document.addEventListener("keydown", (event) => {
      // Press '`' (backtick) to toggle UI
      if (
        event.key === "`" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault()
        toggleUI()
      }

      // Press 't' to toggle 12/24 hour format
      if (
        event.key === "t" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        // Only toggle if search box is not focused
        const searchBox = Core.id("search-value")
        if (document.activeElement !== searchBox) {
          event.preventDefault()
          Clock.toggleFormat()
        }
      }
    })
  }

  /**
   * Render pinned links from config
   */
  const initializePins = () => {
    const pinSection = Core.id("pin")
    Pins.forEach((pin) => {
      const a = document.createElement("a")
      a.href = pin.href
      a.innerHTML = pin.icon
      pinSection.appendChild(a)
    })
  }

  /**
   * Initialize all application modules
   */
  const initialize = () => {
    document.addEventListener(
      "DOMContentLoaded",
      async () => {
        Background.initialize()
        initializeSearchFocus()
        initializeGlobalShortcuts()
        initializePins()
        Clock.start()
        Search.initialize()

        Weather.initialize()
        Weather.updateDisplay(true)
        // Uncomment to enable automatic weather updates
        // Weather.startInterval()
      },
      { once: true },
    )
  }

  return {
    initialize,
  }
})()

// Start the application
App.initialize()
