/**
 * Core Utilities Module
 * Provides common utility functions and constants
 */

const Core = (() => {
  /**
   * Constants for the application
   */
  const CONSTANTS = {
    WEATHER_API_URL: "https://api.open-meteo.com/v1/forecast",
    SEARCH_HINT_URL: "https://suggestqueries.google.com/complete/search",
    CACHE_KEYS: {
      VIDEO_TIME: "bg:time",
      BG_SELECTION: "bg:selection",
      FORECAST_DATA: "forecast-data",
      FORECAST_UNTIL: "forecast-until",
    },
    WEATHER_THRESHOLDS: {
      HEAVY_RAIN: 70,
      LIGHT_RAIN: 40,
      CLOUDY: 50,
      HIGH_UV: 6,
    },
    TIME_INTERVALS: {
      CLOCK_UPDATE: 60000,
      WEATHER_UPDATE: 3600000,
    },
  }

  /**
   * Shorthand for document.getElementById
   */
  const id = (elementId) => document.getElementById(elementId)

  /**
   * Detect platform
   */
  const isMac = navigator.userAgentData
    ? navigator.userAgentData.platform === "macOS"
    : /Mac/.test(navigator.userAgent)

  /**
   * Compose search link based on mode detection
   */
  const composeLink = (search) => {
    const mode = LinkProviders.detect(search)
    if (mode != null) {
      const provider = LinkProviders.getById(mode)
      return provider.link(search)
    }

    return `https://www.google.com/search?q=${search}`
  }

  return {
    CONSTANTS,
    id,
    isMac,
    composeLink,
  }
})()
