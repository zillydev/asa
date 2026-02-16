/**
 * Background Module
 * Manages video and image background switching and persistence
 */

const Background = (() => {
  /**
   * Directory where background files are stored
   * Change this to organize your backgrounds in a subdirectory
   * Examples: './', './backgrounds/', './assets/backgrounds/'
   */
  const BACKGROUND_DIR = "./backgrounds/"

  /**
   * Available background files
   * To add a new background, just add the filename here
   * Supported video formats: .mp4, .webm, .mov
   * Supported image formats: .jpg, .jpeg, .png, .gif, .webp
   */
  const BACKGROUND_FILES = [
    "frieren.mp4",
    "bocchi the rock.jpg",
  ]

  /**
   * Supported formats
   */
  const SUPPORTED_VIDEO_FORMATS = [".mp4", ".webm", ".mov"]
  const SUPPORTED_IMAGE_FORMATS = [".jpg", ".jpeg", ".png", ".gif", ".webp"]

  /**
   * Extract file extension from filename
   */
  const getFileExtension = (filename) => {
    const allFormats = [...SUPPORTED_VIDEO_FORMATS, ...SUPPORTED_IMAGE_FORMATS]
    const formatsPattern = allFormats.map((ext) => ext.slice(1)).join("|")
    const match = filename.match(new RegExp(`\\.(${formatsPattern})$`, "i"))
    return match ? match[0].toLowerCase() : ""
  }

  /**
   * Check if file is a video
   */
  const isVideo = (filename) => {
    const ext = getFileExtension(filename)
    return SUPPORTED_VIDEO_FORMATS.includes(ext)
  }

  /**
   * Check if file is an image
   */
  const isImage = (filename) => {
    const ext = getFileExtension(filename)
    return SUPPORTED_IMAGE_FORMATS.includes(ext)
  }

  /**
   * Generate background objects from filenames
   */
  const BACKGROUNDS = BACKGROUND_FILES.map((file) => {
    const extension = getFileExtension(file)
    const name = extension ? file.slice(0, -extension.length) : file

    // Determine type based on file extension
    let type = "unknown"
    if (isVideo(file)) {
      type = "video"
    } else if (isImage(file)) {
      type = "image"
    }

    return {
      id: name,
      name: name,
      file: file,
      type: type,
    }
  })

  /**
   * Get current background from localStorage or default
   */
  const getCurrent = () => {
    const saved = localStorage.getItem(Core.CONSTANTS.CACHE_KEYS.BG_SELECTION)
    return saved || BACKGROUNDS[0].file
  }

  /**
   * Save current background to localStorage
   */
  const saveCurrent = (file) => {
    localStorage.setItem(Core.CONSTANTS.CACHE_KEYS.BG_SELECTION, file)
  }

  /**
   * Switch to a specific background (video or image)
   */
  const switchBackground = (id) => {
    const background = BACKGROUNDS.find((v) => v.id === id)
    if (!background) {
      console.error(`Background not found: ${id}`)
      return false
    }

    const videoElement = Core.id("bg")
    const imageElement = Core.id("bg-image")
    if (!videoElement) return false

    // Save current time of old video if it was a video
    if (videoElement.src && !videoElement.paused) {
      const currentTime = videoElement.currentTime
      try {
        localStorage.setItem(Core.CONSTANTS.CACHE_KEYS.VIDEO_TIME, currentTime)
      } catch (e) {
        console.warn("Failed to save video time:", e)
      }
    }

    if (background.type === "image") {
      // Switch to image background
      videoElement.style.display = "none"
      videoElement.pause()
      videoElement.src = ""

      if (imageElement) {
        imageElement.style.display = "block"
        imageElement.src = `${BACKGROUND_DIR}${background.file}`

        // Handle image load errors
        imageElement.onerror = () => {
          console.error(`Failed to load image: ${background.file}`)
          // Try to revert to first background as fallback
          if (
            background.id !== BACKGROUNDS[0].id &&
            BACKGROUNDS[0].type === "image"
          ) {
            imageElement.src = `${BACKGROUND_DIR}${BACKGROUNDS[0].file}`
          }
        }
      }
    } else {
      // Switch to video background
      if (imageElement) {
        imageElement.style.display = "none"
        imageElement.src = ""
      }

      videoElement.style.display = "block"
      videoElement.src = `${BACKGROUND_DIR}${background.file}`

      // Handle load errors
      const handleError = () => {
        console.error(`Failed to load video: ${background.file}`)
        // Try to revert to first video as fallback
        if (
          background.id !== BACKGROUNDS[0].id &&
          BACKGROUNDS[0].type === "video"
        ) {
          videoElement.src = `${BACKGROUND_DIR}${BACKGROUNDS[0].file}`
          videoElement.load()
        }
      }

      videoElement.addEventListener("error", handleError, { once: true })
      videoElement.load()

      // Handle play promise rejection (autoplay blocked)
      const playPromise = videoElement.play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Video autoplay blocked:", error)
          // User interaction needed to play
        })
      }
    }

    // Save the new background selection
    saveCurrent(background.file)

    return true
  }

  /**
   * Get current background ID
   */
  const getCurrentId = () => {
    const currentFile = getCurrent()
    const bg = BACKGROUNDS.find((v) => v.file === currentFile)
    return bg ? bg.id : BACKGROUNDS[0].id
  }

  /**
   * Get list of all available backgrounds
   */
  const getList = () => {
    return BACKGROUNDS.map((v) => ({
      id: v.id,
      name: v.name,
      file: v.file,
    }))
  }

  /**
   * Initialize background (video or image) with persistence
   */
  const initialize = () => {
    const videoElement = Core.id("bg")
    const imageElement = Core.id("bg-image")
    if (!videoElement) return

    // Set the saved or default background
    const currentFile = getCurrent()
    const currentBackground =
      BACKGROUNDS.find((v) => v.file === currentFile) || BACKGROUNDS[0]

    if (currentBackground.type === "image") {
      // Initialize image background
      videoElement.style.display = "none"
      if (imageElement) {
        imageElement.style.display = "block"
        imageElement.src = `${BACKGROUND_DIR}${currentFile}`
      }
    } else {
      // Initialize video background
      if (imageElement) {
        imageElement.style.display = "none"
      }
      videoElement.style.display = "block"
      videoElement.src = `${BACKGROUND_DIR}${currentFile}`

      // Continue video from last saved time
      const timestamp = localStorage.getItem(
        Core.CONSTANTS.CACHE_KEYS.VIDEO_TIME,
      )
      if (timestamp) {
        videoElement.currentTime = timestamp
      }

      // Save video position when page is hidden
      window.addEventListener("visibilitychange", () => {
        if (
          document.visibilityState === "hidden" &&
          currentBackground.type === "video"
        ) {
          localStorage.setItem(
            Core.CONSTANTS.CACHE_KEYS.VIDEO_TIME,
            videoElement.currentTime,
          )
        }
      })
    }
  }

  return {
    getCurrent,
    getCurrentId,
    switchBackground,
    getList,
    initialize,
  }
})()
