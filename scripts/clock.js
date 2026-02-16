/**
 * Clock Module
 * Manages time display and updates
 */

const Clock = (() => {
  let clearSecondClock = false
  let secondClock
  let is24HourFormat = localStorage.getItem("clock:24hour") !== "false" // Default to 24-hour

  /**
   * Toggle between 12-hour and 24-hour format
   */
  const toggleFormat = () => {
    is24HourFormat = !is24HourFormat
    localStorage.setItem("clock:24hour", is24HourFormat)
    updateDisplay(true)
  }

  /**
   * Format hour based on current format setting
   */
  const formatHour = (hour) => {
    if (is24HourFormat) {
      return hour <= 9 ? `0${hour}` : hour
    } else {
      // 12-hour format
      const hour12 = hour % 12 || 12
      return hour12
    }
  }

  /**
   * Update the clock display with current time
   */
  const updateDisplay = (initial = false) => {
    const time = new Date()
    const hour = time.getHours()
    const minute = time.getMinutes()

    const displayedMinute = Core.id("minute")
    const displayedHour = Core.id("hour")
    const displayedAmPm = Core.id("ampm")

    // Update minutes if changed
    if (displayedMinute.textContent != minute || initial) {
      displayedMinute.textContent = minute <= 9 ? `0${minute}` : minute
    }

    if (!clearSecondClock && !initial) {
      clearSecondClock = true
      clearInterval(secondClock)
      setInterval(updateDisplay, Core.CONSTANTS.TIME_INTERVALS.CLOCK_UPDATE)
    }

    // Always update hour (format might have changed)
    const formattedHour = formatHour(hour)
    displayedHour.textContent = formattedHour

    // Always update AM/PM indicator
    if (is24HourFormat) {
      displayedAmPm.textContent = ""
    } else {
      displayedAmPm.textContent = hour >= 12 ? " PM" : " AM"
    }
  }

  /**
   * Start the clock
   */
  const start = () => {
    updateDisplay(true)
    secondClock = setInterval(
      updateDisplay,
      (60 - new Date().getSeconds()) * 1000,
    )

    // Add click listener to toggle format
    const timeElement = Core.id("time")
    if (timeElement) {
      timeElement.addEventListener("click", toggleFormat)
    }
  }

  return {
    start,
    updateDisplay,
    toggleFormat,
  }
})()
