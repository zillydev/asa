/**
 * Search Module
 * Manages search functionality including mode detection and suggestions
 */

const Search = (() => {
  let currentMode = null
  let abortController = null
  let cachedTopSites = null
  let autofillHref = null
  let isDeleting = false

  // Pre-cache topSites so autofill is instant on first keystroke
  try {
    chrome.topSites.get().then((sites) => {
      cachedTopSites = sites
    })
  } catch {}

  /**
   * Fetch browser suggestions from topSites and bookmarks
   */
  const fetchBrowserSuggestions = async (query) => {
    const results = []
    const seenUrls = new Set()

    const addResult = (title, url) => {
      const normalized = url.replace(/\/$/, "")
      if (seenUrls.has(normalized)) return
      seenUrls.add(normalized)
      let label = title || url.split("://")[1] || url
      if (label.endsWith("/")) label = label.slice(0, -1)
      results.push({ label, href: url, source: "browser" })
    }

    try {
      if (!cachedTopSites) cachedTopSites = await chrome.topSites.get()
      const lq = query.toLowerCase()
      const matchedSites = lq
        ? cachedTopSites.filter(
            (s) =>
              s.title.toLowerCase().includes(lq) ||
              s.url.toLowerCase().includes(lq),
          )
        : cachedTopSites.slice(0, 5)
      matchedSites.forEach((s) => addResult(s.title, s.url))

      if (query.length >= 1) {
        const bookmarks = await chrome.bookmarks.search(query)
        bookmarks
          .filter((b) => b.url)
          .slice(0, 5)
          .forEach((b) => addResult(b.title, b.url))
      }
    } catch {
      // APIs unavailable outside Chrome extension context
    }

    // Sort: title/URL prefix matches first, then substring-only matches
    if (query) {
      const lq = query.toLowerCase()
      results.sort((a, b) => {
        const aUrl = a.href.replace(/^https?:\/\/(www\.)?/, "").toLowerCase()
        const aPrefix =
          a.label.toLowerCase().startsWith(lq) || aUrl.startsWith(lq)
        const bUrl = b.href.replace(/^https?:\/\/(www\.)?/, "").toLowerCase()
        const bPrefix =
          b.label.toLowerCase().startsWith(lq) || bUrl.startsWith(lq)
        if (aPrefix && !bPrefix) return -1
        if (!aPrefix && bPrefix) return 1
        return 0
      })
    }

    return results.slice(0, 6)
  }

  /**
   * Attach keyboard navigation handlers to a suggestion element
   */
  const attachSuggestionHandlers = (suggestion, searchBox) => {
    // Add click handler for video suggestions
    suggestion.addEventListener("click", (event) => {
      const href = suggestion.href

      // Check if this is a video suggestion
      if (href.includes("#bg-")) {
        event.preventDefault()
        const videoId = decodeURIComponent(href.replace(/.*#bg-/, ""))
        Background.switchBackground(videoId)
        searchBox.value = ""
        updateSuggestionDisplay([])
        updateMode()
        searchBox.focus()
        return
      }
    })

    suggestion.addEventListener("keydown", (event) => {
      const current = event.currentTarget

      // Close dropdown with Escape key
      if (event.code === "Escape") {
        updateSuggestionDisplay([])
        searchBox.focus()
        return
      }

      // Handle Enter key for video suggestions
      if (current === document.activeElement && event.code === "Enter") {
        const href = current.href
        if (href.includes("#bg-")) {
          event.preventDefault()
          const videoId = decodeURIComponent(href.replace(/.*#bg-/, ""))
          Background.switchBackground(videoId)
          searchBox.value = ""
          updateSuggestionDisplay([])
          updateMode()
          searchBox.focus()
          return
        }
      }

      // Arrow Left or Backspace returns to search box from any item
      if (
        current === document.activeElement &&
        (event.code === "ArrowLeft" || event.code === "Backspace")
      ) {
        updateSuggestionDisplay([])
        searchBox.focus()
        requestAnimationFrame(() => {
          searchBox.setSelectionRange(
            searchBox.value.length,
            searchBox.value.length,
          )
        })
        return
      }

      // Arrow Down or "j" (vim) - navigate to next item
      if (
        current === document.activeElement &&
        (event.code === "ArrowDown" || event.key === "j")
      ) {
        event.preventDefault()
        const suggestionBox = Core.id("suggestion")
        const next =
          current.nextElementSibling || suggestionBox.firstElementChild
        if (next) {
          next.focus({ preventScroll: true })
          if (current.nextElementSibling) {
            next.scrollIntoView({ block: "nearest" })
          } else {
            suggestionBox.scrollTo(0, 0)
          }
        }
        return
      }

      // Arrow Up or "k" (vim) - navigate to previous item
      if (
        current === document.activeElement &&
        (event.code === "ArrowUp" || event.key === "k")
      ) {
        event.preventDefault()
        const suggestionBox = Core.id("suggestion")
        const prev =
          current.previousElementSibling || suggestionBox.lastElementChild
        if (prev) {
          prev.focus({ preventScroll: true })
          if (current.previousElementSibling) {
            prev.scrollIntoView({ block: "nearest" })
          } else {
            suggestionBox.scrollTo(0, suggestionBox.scrollHeight)
          }
        }
        return
      }

      if (current === document.activeElement && event.code === "Tab") {
        event.preventDefault()
        searchBox.value = current.textContent
        requestAnimationFrame(() => {
          searchBox.focus()
          fetchSuggestions()
        })
        return
      }
    })
  }

  /**
   * Update suggestion display with new suggestions
   */
  const updateSuggestionDisplay = (suggestions = []) => {
    const suggestionBox = Core.id("suggestion")
    const searchBox = Core.id("search-value")

    suggestionBox.style.display = suggestions.length ? "flex" : "none"

    while (suggestionBox.firstChild) {
      suggestionBox.removeChild(suggestionBox.firstChild)
    }

    let currentSuggestionElement = null

    suggestions.forEach((suggest, index) => {
      const isBrowser = suggest.source === "browser"
      const templateId = isBrowser ? "t-suggest-browser" : "t-suggest"
      const template = Core.id(templateId).content.cloneNode(true)
      const suggestion = template.children[0]
      if (isBrowser) {
        suggestion.querySelector(".suggest__label").textContent = suggest.label
      } else {
        suggestion.textContent = suggest.label
      }
      suggestion.href = suggest.href
      attachSuggestionHandlers(suggestion, searchBox)
      suggestionBox.appendChild(template)

      // Track the first suggestion if it's the current video
      if (index === 0 && suggest.isCurrent) {
        currentSuggestionElement = suggestionBox.lastElementChild
      }
    })

    suggestionBox.scrollTo(0, 0)

    // Auto-focus the current video if it's first in the list
    if (currentSuggestionElement) {
      requestAnimationFrame(() => {
        currentSuggestionElement.focus()
      })
    }

    tryAutofill(suggestions)
  }

  /**
   * Autofill first browser suggestion whose URL or title matches the typed text
   */
  const tryAutofill = (suggestions) => {
    const searchBox = Core.id("search-value")
    const typed = searchBox.value
    if (!typed || isDeleting || searchBox !== document.activeElement) {
      autofillHref = null
      return
    }

    // Skip if the same autofill is already shown
    if (autofillHref && searchBox.selectionStart < searchBox.value.length)
      return

    autofillHref = null

    const lowerTyped = typed.toLowerCase()
    for (const suggest of suggestions) {
      if (suggest.source !== "browser") continue
      // Try URL match first
      const url = suggest.href.replace(/^https?:\/\//, "").replace(/\/$/, "")
      const lowerUrl = url.toLowerCase()
      const noWww = lowerUrl.replace(/^www\./, "")
      if (lowerUrl.startsWith(lowerTyped) || noWww.startsWith(lowerTyped)) {
        const matchStart = lowerUrl.startsWith(lowerTyped)
          ? typed.length
          : url.indexOf(noWww.charAt(0)) + typed.length
        const completion = url.slice(matchStart)
        if (completion) {
          autofillHref = suggest.href
          searchBox.value = typed + completion
          searchBox.setSelectionRange(typed.length, searchBox.value.length)
        }
        break
      }
      // Try title match
      if (suggest.label.toLowerCase().startsWith(lowerTyped)) {
        const completion = suggest.label.slice(typed.length)
        if (completion) {
          autofillHref = suggest.href
          searchBox.value = typed + completion
          searchBox.setSelectionRange(typed.length, searchBox.value.length)
        }
        break
      }
    }
  }

  /**
   * Fetch suggestions from Google hint API
   */
  const fetchSuggestions = async () => {
    const searchBox = Core.id("search-value")

    // Cancel previous request
    if (abortController) {
      abortController.abort()
    }

    // Create new controller
    abortController = new AbortController()

    // Remove Japanese character joiner
    let value = searchBox.value.replace(/\\\b/g, "")

    // Handle numeric pin shortcuts
    if (value.length === 1 && !Number.isNaN(+value)) {
      const index = +value
      const pin = Core.id("pin").children[index - 1]

      if (pin) {
        let label = pin.href.split("://")[1]
        if (label.endsWith("/")) label = label.slice(0, -1)

        return updateSuggestionDisplay([{ label, href: pin.href }])
      }
    }

    // Handle commands with suggest hooks (e.g. bg)
    const suggestProvider = LinkProviders.getAll().find(
      (p) => p.suggest && p.prefix && value.startsWith(p.prefix),
    )
    if (suggestProvider) {
      const query = value.slice(suggestProvider.prefix.length).toLowerCase()
      return updateSuggestionDisplay(suggestProvider.suggest(query))
    }

    if (!value) return updateSuggestionDisplay([])

    // Skip suggestions for direct navigation modes (links, localhost)
    const directProvider = LinkProviders.getAll().find(
      (p) => !p.prefix && p.match(value),
    )
    if (directProvider) return updateSuggestionDisplay([])

    // Extract prefix for special modes
    let prefix = ""
    const matchedProvider = LinkProviders.getAll().find(
      (p) => p.prefix && !p.suggest && value.startsWith(p.prefix),
    )
    if (matchedProvider) {
      prefix = matchedProvider.prefix
      value = value.slice(matchedProvider.prefix.length)
      if (!value) return updateSuggestionDisplay([])
    }

    // Fast path: autofill from browser suggestions immediately
    const browserResults = prefix ? [] : await fetchBrowserSuggestions(value)
    tryAutofill(browserResults)

    // Slow path: fetch Google suggestions and render full dropdown
    try {
      const googleResponse = await fetch(
        `${Core.CONSTANTS.SEARCH_HINT_URL}?client=firefox&q=${encodeURIComponent(value)}`,
        { signal: abortController.signal },
      )

      // Don't show suggestions if value changed to a command since request was made
      const currentValue = searchBox.value
      if (
        LinkProviders.getPrefixes().some((p) => currentValue.startsWith(p)) ||
        (currentValue.length === 1 && !Number.isNaN(+currentValue))
      ) {
        return
      }

      const data = await googleResponse.json()
      const googleSuggestions = data && data[1] ? data[1] : []

      // Dedup: remove Google results whose URLs match a browser result
      const browserUrls = new Set(
        browserResults.map((r) => r.href.replace(/\/$/, "")),
      )
      const googleMapped = googleSuggestions
        .map((s) => ({
          label: s,
          href: `https://www.google.com/search?q=${encodeURIComponent(prefix + s)}`,
        }))
        .filter((s) => !browserUrls.has(s.href.replace(/\/$/, "")))

      const combined = [...browserResults, ...googleMapped]

      if (!combined.length) {
        updateSuggestionDisplay([])
        return
      }

      updateSuggestionDisplay(combined)
    } catch (error) {
      if (error.name !== "AbortError") {
        updateSuggestionDisplay([])
      }
    }
  }

  /**
   * Update search mode icon based on input
   */
  const updateMode = () => {
    const searchBox = Core.id("search-value")
    const newMode = LinkProviders.detect(searchBox.value, currentMode)
    const searchIcon = Core.id("search-icon")
    const modeIcon = Core.id("search-icon-override")

    if (newMode !== null) {
      currentMode = newMode
      const provider = LinkProviders.getById(currentMode)
      modeIcon.innerHTML = provider.icon(searchBox.value)

      searchIcon.classList.add("fade-out-up")
      modeIcon.classList.remove("fade-out-down")
    } else {
      currentMode = null
      modeIcon.innerHTML = ""

      searchIcon.classList.remove("fade-out-up")
      modeIcon.classList.add("fade-out-down")
    }
  }

  /**
   * Initialize search functionality
   */
  const initialize = () => {
    const searchBox = Core.id("search-value")
    const searchForm = Core.id("search")
    const suggestionBox = Core.id("suggestion")

    searchForm.addEventListener("submit", (event) => {
      event.preventDefault()
      if (autofillHref) {
        window.location.assign(autofillHref)
      } else {
        window.location.assign(Core.composeLink(searchBox.value))
      }
    })

    searchBox.addEventListener("input", (event) => {
      isDeleting = event.inputType && event.inputType.startsWith("delete")
      updateMode()
      fetchSuggestions()
    })

    searchBox.addEventListener("keydown", (event) => {
      // Close dropdown with Escape key
      if (event.code === "Escape") {
        updateSuggestionDisplay([])
        searchBox.blur()
        return
      }

      // Arrow Down or Ctrl+j - navigate to first suggestion (no vim keys here to allow typing 'j'/'k')
      if (
        searchBox === document.activeElement &&
        (event.code === "ArrowDown" || (event.ctrlKey && event.key === "j"))
      ) {
        // Only navigate if there are suggestions visible
        if (
          suggestionBox.firstElementChild &&
          suggestionBox.style.display !== "none"
        ) {
          event.preventDefault()
          requestAnimationFrame(() => {
            suggestionBox.firstElementChild.focus()
          })
        }
      }
    })

    // Close dropdown when clicking outside
    document.addEventListener("click", (event) => {
      const isClickInsideSearch = searchForm.contains(event.target)
      const isClickInsideSuggestions = suggestionBox.contains(event.target)

      if (!isClickInsideSearch && !isClickInsideSuggestions) {
        updateSuggestionDisplay([])
      }
    })

    // Apply custom scrollbar for non-Mac
    if (!Core.isMac) {
      suggestionBox.classList.add("-custom-scrollbar")
    }
  }

  return {
    initialize,
    fetchSuggestions,
    updateMode,
  }
})()
