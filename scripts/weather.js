/**
 * Weather Module
 * Manages weather data fetching and display
 */

const Weather = (() => {
  let isFetching = false
  let weatherClock

  /**
   * Get geolocation from browser or user input
   */
  const getGeolocation = () => {
    // Check if geolocation API exists
    if (!navigator.geolocation) {
      return Promise.reject(new Error("Geolocation not supported"))
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve(coords),
        (error) => {
          console.warn("Geolocation failed:", error)

          // Try URL parameter
          const href = location.href
          const query = new URL(href).searchParams
          const latlon = query.get("latlon")
          if (latlon) {
            const [latitude, longitude] = latlon.split(",").map(Number)

            if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
              return resolve({ latitude, longitude })
            }

            return reject(new Error("Invalid location from URL"))
          }

          // Prompt user
          const latLon = prompt("Latitude,Longtitude")
          if (!latLon) return reject(new Error("No location provided"))

          const [latitude, longitude] = latLon.split(",").map(Number)

          if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
            resolve({ latitude, longitude })
          } else {
            reject(new Error("Invalid location format"))
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 300000, // 5 minutes cache
          timeout: 10000, // 10 second timeout
        },
      )
    })
  }

  /**
   * Fetch weather data from API or cache
   */
  const fetchWeatherData = async (initial = false) => {
    const { CACHE_KEYS } = Core.CONSTANTS
    const lastSaved = localStorage.getItem(CACHE_KEYS.FORECAST_UNTIL)

    if (
      lastSaved &&
      localStorage.getItem(CACHE_KEYS.FORECAST_DATA) &&
      Date.now() < new Date(lastSaved).getTime()
    ) {
      return JSON.parse(localStorage.getItem(CACHE_KEYS.FORECAST_DATA))
    }

    if (initial) throw new Error("No cached data")

    try {
      const geolocation = await getGeolocation()
      const { latitude, longitude } = geolocation

      if (isFetching) return
      isFetching = true

      try {
        const data = await fetch(
          `${Core.CONSTANTS.WEATHER_API_URL}?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,uv_index,cloud_cover,precipitation_probability&timezone=auto&forecast_days=14`,
        ).then((response) => response.json())

        localStorage.setItem(CACHE_KEYS.FORECAST_UNTIL, data.hourly.time.at(-1))
        localStorage.setItem(CACHE_KEYS.FORECAST_DATA, JSON.stringify(data))

        return data
      } catch (error) {
        console.error("Weather fetch failed:", error)
        return null
      } finally {
        isFetching = false
      }
    } catch (error) {
      console.error("Geolocation failed:", error)
      return null
    }
  }

  /**
   * Determine weather icon based on conditions
   */
  const determineWeatherIcon = (prediction, cloudCover, uvIndex, hour) => {
    const { WEATHER_THRESHOLDS } = Core.CONSTANTS
    const isNight = hour < 6 || hour > 18

    if (prediction > WEATHER_THRESHOLDS.HEAVY_RAIN) return "rain"
    if (prediction > WEATHER_THRESHOLDS.LIGHT_RAIN) return "drizzle"
    if (cloudCover > WEATHER_THRESHOLDS.CLOUDY) return "cloud"
    if (uvIndex >= WEATHER_THRESHOLDS.HIGH_UV) return "sun"
    if (isNight) return "moon"
    return "sun"
  }

  /**
   * Update weather display
   */
  const updateDisplay = async (initial = false) => {
    try {
      const data = await fetchWeatherData(initial)
      if (!data) return

      const {
        hourly: {
          time: times,
          temperature_2m: temperatures,
          uv_index: uvIndices,
          cloud_cover: cloudCovers,
          precipitation_probability: predictions,
        },
      } = data

      const startAt = new Date(times[0]).getTime()
      const secondAt = new Date(times[1]).getTime()
      const interval = secondAt - startAt

      const hour = new Date().getHours()
      const currentTime = new Date().getTime()
      const index = Math.floor((currentTime - startAt) / interval)

      // Clamp index to valid array range
      const safeIndex = Math.max(0, Math.min(index, temperatures.length - 1))

      const temperature = temperatures[safeIndex]
      const prediction = predictions[safeIndex]
      const uvIndex = uvIndices[safeIndex]
      const cloudCover = cloudCovers[safeIndex]

      const iconName = determineWeatherIcon(
        prediction,
        cloudCover,
        uvIndex,
        hour,
      )

      // Update icon
      const weatherIcon = Core.id("weather-icon")
      Icons.setIcon(weatherIcon, iconName)

      // Update values
      Core.id("temperature").textContent = ~~temperature
      Core.id("rain").textContent = ~~prediction
      Core.id("uv-index").textContent = Math.floor(uvIndex || 0)
    } catch (error) {
      if (!initial) console.error("Weather update failed:", error)
    }
  }

  /**
   * Start weather update interval
   */
  const startInterval = () => {
    // Clear any existing interval
    if (weatherClock) {
      clearInterval(weatherClock)
    }

    // Update weather every hour
    weatherClock = setInterval(() => {
      updateDisplay()
    }, Core.CONSTANTS.TIME_INTERVALS.WEATHER_UPDATE)

    // Initial update
    updateDisplay()
  }

  /**
   * Initialize weather module
   */
  const initialize = () => {
    Core.id("status").addEventListener("click", () => updateDisplay())
  }

  return {
    initialize,
    updateDisplay,
    startInterval,
  }
})()
